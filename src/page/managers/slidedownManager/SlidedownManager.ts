import { TagsObjectForApi, TagsObjectWithBoolean } from "../../models/Tags";
import TaggingContainer from "../../slidedown/TaggingContainer";
import TagUtils from "../../../shared/utils/TagUtils";
import { ContextInterface } from "../../models/Context";
import Slidedown, { manageNotifyButtonStateWhileSlidedownShows } from "../../slidedown/Slidedown";
import { CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS } from "../../../shared/config/constants";
import PermissionMessageDismissedError from "../../errors/PermissionMessageDismissedError";
import { NotificationPermission } from "../../../shared/models/NotificationPermission";
import { OneSignalUtils } from "../../../shared/utils/OneSignalUtils";
import ChannelCaptureContainer from "../../slidedown/ChannelCaptureContainer";
import LocalStorage from "../../../shared/utils/LocalStorage";
import ConfirmationToast from "../../slidedown/ConfirmationToast";
import { awaitableTimeout } from "../../../shared/utils/AwaitableTimeout";
import { DismissPrompt } from "../../models/Dismiss";
import Database from "../../../shared/services/Database";
import AlreadySubscribedError from "../../errors/AlreadySubscribedError";
import { ChannelCaptureError, InvalidChannelInputField } from "../../../page/errors/ChannelCaptureError";
import ExistingChannelError from "../../../page/errors/ExistingChannelError";
import PushPermissionNotGrantedError, { PushPermissionNotGrantedErrorReason } from "../../../shared/errors/PushPermissionNotGrantedError";
import { DismissHelper } from "../../../shared/helpers/DismissHelper";
import InitHelper, { RegisterOptions } from "../../../shared/helpers/InitHelper";
import PromptsHelper from "../../../shared/helpers/PromptsHelper";
import Log from "../../../shared/libraries/Log";
import { DelayedPromptType } from "../../../shared/models/Prompts";
import { AutoPromptOptions } from "../PromptsManager";
import OneSignalError from "../../../shared/errors/OneSignalError";
import { NotSubscribedError, NotSubscribedReason } from "../../../shared/errors/NotSubscribedError";

export class SlidedownManager {
  private context: ContextInterface;
  private slidedownQueue: AutoPromptOptions[];
  private isSlidedownShowing: boolean;
  slidedown?: Slidedown;

  constructor(
    context: ContextInterface,
    ) {
    this.context = context;
    this.slidedownQueue = [];
    this.isSlidedownShowing = false;
  }

  /* P R I V A T E */

  private async checkIfSlidedownShouldBeShown(options: AutoPromptOptions): Promise<boolean> {
    const permissionDenied = await OneSignal.notifications.getPermissionStatus() === NotificationPermission.Denied;
    let wasDismissed: boolean;

    const subscriptionInfo: PushSubscriptionState = await OneSignal.context.subscriptionManager.getSubscriptionState();
    const { subscribed, optedOut } = subscriptionInfo;

    const slidedownType = options.slidedownPromptOptions?.type;

    let isSlidedownPushDependent: boolean = false;

    if (!!slidedownType) {
      isSlidedownPushDependent = PromptsHelper.isSlidedownPushDependent(slidedownType);
    }

    // applies to both push and category slidedown types
    if (isSlidedownPushDependent) {
      if (subscribed) {
        // applies to category slidedown type only
        if (options.isInUpdateMode) {
          return true;
        }

        Log.info(new AlreadySubscribedError());
        return false;
      }

      wasDismissed = DismissHelper.wasPromptOfTypeDismissed(DismissPrompt.Push);

      if (optedOut) {
        throw new NotSubscribedError(NotSubscribedReason.OptedOut);
      }

      if (permissionDenied) {
        Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
        return false;
      }
    } else {
      if (!options.force) {
        const smsSubscribed = !!(await Database.getSMSProfile()).subscriptionId;
        const emailSubscribed = !!(await Database.getEmailProfile()).subscriptionId;
        const bothSubscribed = smsSubscribed && emailSubscribed;

        if (smsSubscribed && (slidedownType === DelayedPromptType.Sms)) {
          Log.info(new ExistingChannelError(DelayedPromptType.Sms));
          return false;
        }

        if (emailSubscribed && (slidedownType === DelayedPromptType.Email)) {
          Log.info(new ExistingChannelError(DelayedPromptType.Email));
          return false;
        }

        if (bothSubscribed && (slidedownType === DelayedPromptType.SmsAndEmail)) {
          Log.info(new ExistingChannelError(DelayedPromptType.SmsAndEmail));
          return false;
        }
      }

      wasDismissed = DismissHelper.wasPromptOfTypeDismissed(DismissPrompt.NonPush);
    }

    if (wasDismissed && !options.force && !options.isInUpdateMode) {
      Log.info(new PermissionMessageDismissedError(slidedownType));
      return false;
    }

    return true;
  }

  private registerForPush(): void {
    const autoAccept = !OneSignal.environmentInfo.requiresUserInteraction;
    const options: RegisterOptions = { autoAccept, slidedown: true };
    InitHelper.registerForPushNotifications(options);
  }

  private async handleAllowForCategoryType(): Promise<void> {
    if (!this.slidedown) {
      throw new OneSignalError(`SlidedownManager: handleAllowForCategoryType: this.slidedown is undefined`);
    }

    const tags = TaggingContainer.getValuesFromTaggingContainer();
    this.context.tagManager.storeTagValuesToUpdate(tags);

    const isPushEnabled: boolean = LocalStorage.getIsPushNotificationsEnabled();
    if (isPushEnabled) {
      // already subscribed, send tags immediately
      this.slidedown.setSaveState();
      await this.context.tagManager.sendTags(true);
    } else {
      this.registerForPush();
      // tags are sent on the subscription change event handler
    }
  }

  private async handleAllowForEmailType(): Promise<void> {
    if (!this.slidedown) {
      throw new OneSignalError(`SlidedownManager: handleAllowForEmailType: this.slidedown is undefined`);
    }

    const emailInputFieldIsValid = this.slidedown.channelCaptureContainer?.emailInputFieldIsValid;
    const isEmailEmpty = this.slidedown.channelCaptureContainer?.isEmailInputFieldEmpty();

    if (!emailInputFieldIsValid || isEmailEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);
    }

    const email = this.slidedown.channelCaptureContainer?.getValueFromEmailInput();
    this.updateEmail(email);
  }

  private async handleAllowForSmsType(): Promise<void> {
    if (!this.slidedown) {
      throw new OneSignalError(`SlidedownManager: handleAllowForSmsType: this.slidedown is undefined`);
    }

    const smsInputFieldIsValid = this.slidedown.channelCaptureContainer?.smsInputFieldIsValid;
    const isSmsEmpty = this.slidedown.channelCaptureContainer?.isSmsInputFieldEmpty();

    if (!smsInputFieldIsValid || isSmsEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
    }

    const sms = this.slidedown.channelCaptureContainer?.getValueFromSmsInput();
    this.updateSMS(sms);
  }

  private async handleAllowForSmsAndEmailType(): Promise<void> {
    if (!this.slidedown) {
      throw new OneSignalError(`SlidedownManager: handleAllowForSmsAndEmailType: this.slidedown is undefined`);
    }

    const smsInputFieldIsValid = this.slidedown.channelCaptureContainer?.smsInputFieldIsValid;
    const emailInputFieldIsValid = this.slidedown.channelCaptureContainer?.emailInputFieldIsValid;
    /**
     * empty input fields are considered valid since in the case of two input field types present,
     * we can accept one of the two being left as an empty string.
     *
     * thus, we need separate checks for the emptiness properties
     */
    const isEmailEmpty = this.slidedown.channelCaptureContainer?.isEmailInputFieldEmpty();
    const isSmsEmpty = this.slidedown.channelCaptureContainer?.isSmsInputFieldEmpty();

    const bothFieldsEmpty = isEmailEmpty && isSmsEmpty;
    const bothFieldsInvalid = !smsInputFieldIsValid && !emailInputFieldIsValid;

    if (bothFieldsInvalid || bothFieldsEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmailAndSms);
    }

    const email = this.slidedown.channelCaptureContainer?.getValueFromEmailInput();
    const sms = this.slidedown.channelCaptureContainer?.getValueFromSmsInput();

    /**
     * empty is ok (we can accept only one of two input fields), but invalid is not
     * at least one field is valid and non-empty
     */
    if (emailInputFieldIsValid) {
      if (!isEmailEmpty) {
        this.updateEmail(email);
      }
    } else {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);
    }

    if (smsInputFieldIsValid) {
      if (!isSmsEmpty) {
        this.updateSMS(sms);
      }
    } else {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
    }
  }

  private updateEmail(email?: string): void {
    if (!email) {
      return;
    }
    OneSignal.User.addEmail(email);
  }

  private updateSMS(sms?: string): void {
    if (!sms) {
      return;
    }
    OneSignal.User.addSms(sms);
  }

  private async showConfirmationToast(): Promise<void> {
    if (!this.slidedown) {
      throw new OneSignalError(`SlidedownManager: showConfirmationToast: this.slidedown is undefined`);
    }

    const confirmMessage = this.slidedown.options.text.confirmMessage;
    if (!confirmMessage) {
      return;
    }
    await awaitableTimeout(1000);
    const confirmationToast = new ConfirmationToast(confirmMessage);
    await confirmationToast.show();
    await awaitableTimeout(5000);
    confirmationToast.close();
    ConfirmationToast.triggerSlidedownEvent(ConfirmationToast.EVENTS.CLOSED);
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

        if (this.slidedown) {
          this.slidedown.channelCaptureContainer = channelCaptureContainer;
        }
      }
    } catch (e) {
      Log.error("OneSignal: Attempted to create channel capture container with error", e);
    }
  }

  /* P U B L I C */

  public async handleAllowClick(): Promise<void> {
    if (!this.slidedown) {
      throw new OneSignalError(`SlidedownManager: handleAllowClick: this.slidedown is undefined`);
    }
    const slidedownType: DelayedPromptType = this.slidedown.options.type;

    if (this.slidedown.isShowingFailureState) {
      this.slidedown.removeFailureState();
    }

    try {
      switch (slidedownType) {
        case DelayedPromptType.Push:
          this.registerForPush();
          break;
        case DelayedPromptType.Category:
          await this.handleAllowForCategoryType();
          break;
        case DelayedPromptType.Email:
          await this.handleAllowForEmailType();
          break;
        case DelayedPromptType.Sms:
          await this.handleAllowForSmsType();
          break;
        case DelayedPromptType.SmsAndEmail:
          await this.handleAllowForSmsAndEmailType();
          break;
        default:
          break;
      }
    } catch (e) {
      Log.warn("OneSignal Slidedown failed to update:", e);
      // Display update error
      this.slidedown.removeSaveState();
      this.slidedown.setFailureState();

      if (e.reason !== undefined) {
        this.slidedown.setFailureStateForInvalidChannelInput(e.reason);
      }
      return;
    }

    if (this.slidedown) {
      this.slidedown.close();

      if (!PromptsHelper.isSlidedownPushDependent(slidedownType)) {
        await this.showConfirmationToast();
      }
      // timeout to allow slidedown close animation to finish in case another slidedown is queued
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

    manageNotifyButtonStateWhileSlidedownShows();

    if (this.isSlidedownShowing) {
      // already showing, enqueue
      this.enqueue(options);
      return;
    }

    try {
      this.setIsSlidedownShowing(true);
      const slidedownPromptOptions = options.slidedownPromptOptions || CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
      this.slidedown = new Slidedown(slidedownPromptOptions);
      await this.slidedown.create(options.isInUpdateMode);
      await this.mountAuxiliaryContainers(options);
      Log.debug('Showing OneSignal Slidedown');
      Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.SHOWN);
    } catch (e) {
      Log.error("There was an error showing the OneSignal Slidedown:", e);
      this.setIsSlidedownShowing(false);
      this.slidedown?.close();
    }
  }
}
