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
    }

    public dequeue(): AutoPromptOptions | undefined {
        return this.slidedownQueue.shift();
    }

    public async createSlidedown(options: AutoPromptOptions): Promise<void> {
        if (this.isSlidedownShowing) {
            // already showing, enqueue
            this.enqueue(options);
            return;
        }

        const slidedownPromptOptions = options.slidedownPromptOptions || CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
        OneSignal.slidedown = new Slidedown(slidedownPromptOptions);
        await OneSignal.slidedown.create(options.isInUpdateMode);
        await this.mountSpecialContainers(options);
        this.setIsSlidedownShowing(true);
        Log.debug('Showing OneSignal Slidedown');
    }

    private async mountSpecialContainers(options: AutoPromptOptions): Promise<void> {
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
        // to do
    }
}