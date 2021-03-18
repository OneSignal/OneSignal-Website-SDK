import { TagsObjectForApi, TagsObjectWithBoolean } from "../../models/Tags";
import TaggingContainer from "../../slidedown/TaggingContainer";
import TagUtils from "../../utils/TagUtils";
import { ContextInterface } from "../../models/Context";
import { DelayedPromptType } from "../../models/Prompts";
import Slidedown from "../../slidedown/Slidedown";
import { AutoPromptOptions } from "../PromptsManager";
import Log from "../../libraries/Log";
import { CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS } from "../../config";
import { NotSubscribedError, NotSubscribedReason } from "../../errors/NotSubscribedError";
import PermissionMessageDismissedError from "../../errors/PermissionMessageDismissedError";
import PushPermissionNotGrantedError, {
    PushPermissionNotGrantedErrorReason
} from "../../errors/PushPermissionNotGrantedError";
import MainHelper from "../../helpers/MainHelper";
import { NotificationPermission } from "../../models/NotificationPermission";
import { OneSignalUtils } from "../../utils/OneSignalUtils";
import ChannelCaptureContainer from "../../slidedown/ChannelCaptureContainer";
import { ChannelCaptureError, InvalidChannelInputField } from "../../errors/ChannelCaptureError";
import InitHelper, { RegisterOptions } from "../../helpers/InitHelper";
import LocalStorage from "../../utils/LocalStorage";
import DismissHelper from "../../helpers/DismissHelper";

export class SlidedownManager {
    private context: ContextInterface;
    private slidedownQueue: AutoPromptOptions[];
    private isSlidedownShowing: boolean;

    constructor(context: ContextInterface) {
        this.context = context;
        this.slidedownQueue = [];
        this.isSlidedownShowing = false;
    }

    private async checkIfSlidedownShouldBeShown(options: AutoPromptOptions): Promise<boolean> {
        const wasDismissed = MainHelper.wasHttpsNativePromptDismissed();
        const permissionDenied = await OneSignal.privateGetNotificationPermission() === NotificationPermission.Denied;
        const isSubscribed = await OneSignal.privateIsPushNotificationsEnabled();
        const notOptedOut = await OneSignal.privateGetSubscription();

        const slidedownType = options.slidedownPromptOptions?.type;
        const slidedownIsPushDependent = slidedownType === DelayedPromptType.Push ||
            slidedownType === DelayedPromptType.Category;

        // applies to push slidedown type only
        if (slidedownType === DelayedPromptType.Push && isSubscribed) {
            return false;
        }

        // applies to both push and category slidedown types
        if (slidedownIsPushDependent) {
            if (!notOptedOut) {
                throw new NotSubscribedError(NotSubscribedReason.OptedOut);
            }

            if (permissionDenied) {
                Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
                return false;
            }

            if (wasDismissed && !isSubscribed && !options.force) {
                Log.info(new PermissionMessageDismissedError());
                return false;
            }
        }

        return true;
    }

    private registerForPush(): void {
        const autoAccept = !OneSignal.environmentInfo.requiresUserInteraction;
        const options: RegisterOptions = { autoAccept, slidedown: true };
        InitHelper.registerForPushNotifications(options);
    }

    public async handleAllowClick(): Promise<void> {
        const { slidedown } = OneSignal;
        const slidedownType: DelayedPromptType = slidedown.options.type;

        if (slidedown.isShowingFailureState) {
            slidedown.setFailureState(false);
        }

        let smsInputFieldIsValid, emailInputFieldIsValid;

        if (!!slidedown.channelCaptureContainer) {
            smsInputFieldIsValid = slidedown.channelCaptureContainer.smsInputFieldIsValid;
            emailInputFieldIsValid = slidedown.channelCaptureContainer.emailInputFieldIsValid;
        }

        try {
            switch (slidedownType) {
                case DelayedPromptType.Push:
                    this.registerForPush();
                    break;
                case DelayedPromptType.Category:
                    const tags = TaggingContainer.getValuesFromTaggingContainer();
                    this.context.tagManager.storeTagValuesToUpdate(tags);

                    const isPushEnabled: boolean = LocalStorage.getIsPushNotificationsEnabled();
                    if (isPushEnabled) {
                        slidedown.setSaveState(true);
                        await this.context.tagManager.sendTags(true);
                    } else {
                        this.registerForPush();
                        // tags are sent on the subscription change event handler
                    }
                    break;
                case DelayedPromptType.Email:
                    const isEmailEmpty = ChannelCaptureContainer.isEmailInputFieldEmpty();
                    if (!emailInputFieldIsValid || isEmailEmpty) {
                        throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);
                    }
                    break;
                case DelayedPromptType.Sms:
                    const isSmsEmpty = ChannelCaptureContainer.isSmsInputFieldEmpty();
                    if (!smsInputFieldIsValid || isSmsEmpty) {
                        throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
                    }
                    break;
                case DelayedPromptType.SmsAndEmail:
                    const bothFieldsEmpty = ChannelCaptureContainer.areBothInputFieldsEmpty();
                    const bothFieldsInvalid = !smsInputFieldIsValid && !emailInputFieldIsValid;

                    if (bothFieldsInvalid || bothFieldsEmpty) {
                        throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmailAndSms);
                    }

                    if (!smsInputFieldIsValid) throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
                    if (!emailInputFieldIsValid) throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);

                    // TO DO: send sms email updates
                    break;
                default:
                    break;
            }
        } catch (e) {
            Log.warn("OneSignal Slidedown failed to update:", e);
            // Display update error
            slidedown.setSaveState(false);
            slidedown.setFailureState(true, e.reason);
            return;
        }

        if (slidedown) {
            slidedown.close();
            // called here for compatibility with unit tests (close function doesn't run fully in test env)
            Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
        }

        // TO DO: clean up a bit
        switch (slidedownType) {
            case DelayedPromptType.Push:
            case DelayedPromptType.Category:
            Log.debug("Setting flag to not show the slidedown to the user again.");
            DismissHelper.markHttpsNativePromptDismissed();
            break;
            default:
            break;
        }
    }

    public setIsSlidedownShowing(isShowing: boolean): void {
        this.isSlidedownShowing = isShowing;
    }

    public async showQueued(): Promise<void> {
        if (this.slidedownQueue.length > 0) {
            const options = this.dequeue();

            if (!!options) {
                await this.createSlidedown(options);
            }
        }
    }

    public enqueue(options: AutoPromptOptions): void {
        this.slidedownQueue.push(options);
        Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.QUEUED);
    }

    public dequeue(): AutoPromptOptions | undefined {
        return this.slidedownQueue.shift();
    }

    public async createSlidedown(options: AutoPromptOptions): Promise<void> {
        OneSignalUtils.logMethodCall("createSlidedown");
        try {
            const showPrompt = await this.checkIfSlidedownShouldBeShown(options);
            if (!showPrompt) { return; }
        } catch (e) {
            Log.warn("checkIfSlidedownShouldBeShown returned an error", e);
            return;
        }

        if (this.isSlidedownShowing) {
            // already showing, enqueue
            this.enqueue(options);
            return;
        }

        try {
            this.setIsSlidedownShowing(true);
            const slidedownPromptOptions = options.slidedownPromptOptions || CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
            OneSignal.slidedown = new Slidedown(slidedownPromptOptions);
            await OneSignal.slidedown.create(options.isInUpdateMode);
            await this.mountAuxiliaryContainers(options);
            Log.debug('Showing OneSignal Slidedown');
        } catch (e) {
            Log.error("There was an error showing the OneSignal Slidedown:", e);
            this.setIsSlidedownShowing(false);
            OneSignal.slidedown.close();
        }
    }

    private async mountAuxiliaryContainers(options: AutoPromptOptions): Promise<void> {
        switch (options.slidedownPromptOptions?.type) {
            case DelayedPromptType.Category:
                this.mountTaggingContainer(options);
                break;
            case DelayedPromptType.Email:
            case DelayedPromptType.Sms:
            case DelayedPromptType.SmsAndEmail:
                await this.mountChannelCaptureContainer(options);
                break;
            default:
                break;
        }
    }

    private async mountTaggingContainer(options: AutoPromptOptions): Promise<void> {
        OneSignalUtils.logMethodCall("mountTaggingContainer");
        try {
            // show slidedown with tagging container
            let tagsForComponent: TagsObjectWithBoolean = {};
            const taggingContainer = new TaggingContainer();
            const categories = options.slidedownPromptOptions?.categories;

            if (!categories) {
                throw new Error("Categories not defined");
            }

            if (options.isInUpdateMode) {
                taggingContainer.load();
                // updating. pull remote tags.
                const existingTags = await OneSignal.getTags() as TagsObjectForApi;
                this.context.tagManager.storeRemotePlayerTags(existingTags);
                tagsForComponent = TagUtils.convertTagsApiToBooleans(existingTags);
            } else {
                // first subscription
                TagUtils.markAllTagsAsSpecified(categories, true);
            }

            taggingContainer.mount(categories, tagsForComponent);
        } catch (e) {
            Log.error("OneSignal: Attempted to create tagging container with error", e);
        }
    }

    private async mountChannelCaptureContainer(options: AutoPromptOptions): Promise<void> {
        OneSignalUtils.logMethodCall("mountChannelCaptureContainer");
        try {
            if (!!options.slidedownPromptOptions) {
                const channelCaptureContainer = new ChannelCaptureContainer(options.slidedownPromptOptions);
                channelCaptureContainer.mount();
                OneSignal.slidedown.channelCaptureContainer = channelCaptureContainer;
            }
        } catch (e) {
            Log.error("OneSignal: Attempted to create channel capture container with error", e);
        }
    }
}
