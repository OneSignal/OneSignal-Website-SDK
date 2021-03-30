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
import { NotificationPermission } from "../../models/NotificationPermission";
import { OneSignalUtils } from "../../utils/OneSignalUtils";
import ChannelCaptureContainer from "../../slidedown/ChannelCaptureContainer";
import { ChannelCaptureError, InvalidChannelInputField } from "../../errors/ChannelCaptureError";
import InitHelper, { RegisterOptions } from "../../helpers/InitHelper";
import LocalStorage from "../../utils/LocalStorage";
import { DismissHelper } from "../../helpers/DismissHelper";
import PromptsHelper from "../../helpers/PromptsHelper";
import ConfirmationToast from "../../slidedown/ConfirmationToast";
import { awaitableTimeout } from "../../utils/AwaitableTimeout";
import { DismissPrompt } from "../../models/Dismiss";

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
    const permissionDenied = await OneSignal.privateGetNotificationPermission() === NotificationPermission.Denied;
    const isSubscribed = await OneSignal.privateIsPushNotificationsEnabled();
    const notOptedOut = await OneSignal.privateGetSubscription();
    let wasDismissed: boolean;

    const slidedownType = options.slidedownPromptOptions?.type;

    let isSlidedownPushDependent: boolean = false;

    if (!!slidedownType) {
      isSlidedownPushDependent = PromptsHelper.isSlidedownPushDependent(slidedownType);
    }

    // applies to push slidedown type only
    if (slidedownType === DelayedPromptType.Push && isSubscribed) {
      return false;
    }

    // applies to both push and category slidedown types
    if (isSlidedownPushDependent) {
      wasDismissed = DismissHelper.wasPromptOfTypeDismissed(DismissPrompt.Push);

      if (!notOptedOut) {
        throw new NotSubscribedError(NotSubscribedReason.OptedOut);
      }

      if (permissionDenied) {
        Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
        return false;
      }

      if (wasDismissed && !options.force && !options.isInUpdateMode) {
        Log.info(new PermissionMessageDismissedError(slidedownType));
        return false;
      }
    } else {
      wasDismissed = DismissHelper.wasPromptOfTypeDismissed(DismissPrompt.NonPush);

      if (wasDismissed && !options.force && !options.isInUpdateMode) {
        Log.info(new PermissionMessageDismissedError(slidedownType));
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
      slidedown.removeFailureState();
    }

    let smsInputFieldIsValid, emailInputFieldIsValid, isEmailEmpty, isSmsEmpty: boolean;
    let email, sms: string;

    smsInputFieldIsValid = emailInputFieldIsValid = isEmailEmpty = isSmsEmpty = false;
    email = sms = "";

    if (!!slidedown.channelCaptureContainer) {
      /**
       * empty input fields are considered valid since in the case of two input field types present,
       * we can accept one of the two being left as an empty string.
       *
       * thus, we need separate checks for the emptiness properties
       */
      smsInputFieldIsValid = slidedown.channelCaptureContainer.smsInputFieldIsValid;
      emailInputFieldIsValid = slidedown.channelCaptureContainer.emailInputFieldIsValid;
      isEmailEmpty = ChannelCaptureContainer.isEmailInputFieldEmpty();
      isSmsEmpty = ChannelCaptureContainer.isSmsInputFieldEmpty();

      /** */
      email = ChannelCaptureContainer.getValueFromEmailInput();
      sms = ChannelCaptureContainer.getValueFromSmsInput();
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
            // already subscribed, send tags immediately
            slidedown.setSaveState();
            await this.context.tagManager.sendTags(true);
          } else {
            this.registerForPush();
            // tags are sent on the subscription change event handler
          }
          break;
        case DelayedPromptType.Email:
          if (!emailInputFieldIsValid || isEmailEmpty) {
            throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);
          }
          this.context.updateManager.updateEmail(email);
          break;
        case DelayedPromptType.Sms:
          if (!smsInputFieldIsValid || isSmsEmpty) {
            throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
          }
          this.context.updateManager.updateSms(sms);
          break;
        case DelayedPromptType.SmsAndEmail:
          const bothFieldsEmpty = isEmailEmpty && isSmsEmpty;
          const bothFieldsInvalid = !smsInputFieldIsValid && !emailInputFieldIsValid;

          if (bothFieldsInvalid || bothFieldsEmpty) {
            throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmailAndSms);
          }

          /**
           * empty is ok (we can accept only one of two input fields), but invalid is not
           * at least one field is valid and non-empty
           */
          if (emailInputFieldIsValid) {
            if (!isEmailEmpty) {
              this.context.updateManager.updateEmail(email);
            }
          } else {
            throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);
          }

          if (smsInputFieldIsValid) {
            if (!isSmsEmpty) {
              this.context.updateManager.updateSms(sms);
            }
          } else {
            throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
          }
          break;
        default:
          break;
      }
    } catch (e) {
      Log.warn("OneSignal Slidedown failed to update:", e);
      // Display update error
      slidedown.removeSaveState();
      slidedown.setFailureState();

      if (e.reason !== undefined) {
        slidedown.setFailureStateForInvalidChannelInput(e.reason);
      }
      return;
    }

    if (slidedown) {
      slidedown.close();

      if (!PromptsHelper.isSlidedownPushDependent(slidedownType)) {
        const { confirmMessage } = slidedown.options.text;
        await awaitableTimeout(1000);
        const confirmationToast = new ConfirmationToast(confirmMessage);
        await confirmationToast.show();
        await awaitableTimeout(5000);
        confirmationToast.close();
        ConfirmationToast.triggerSlidedownEvent(ConfirmationToast.EVENTS.CLOSED);
      }
      await awaitableTimeout(1000);

      Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
    }

    switch (slidedownType) {
      case DelayedPromptType.Push:
      case DelayedPromptType.Category:
        Log.debug("Setting flag to not show the slidedown to the user again.");
        DismissHelper.markPromptDismissedWithType(DismissPrompt.Push);
        break;
      default:
        Log.debug("Setting flag to not show the slidedown to the user again.");
        DismissHelper.markPromptDismissedWithType(DismissPrompt.NonPush);
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
