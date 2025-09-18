import type {
  TagsObjectForApi,
  TagsObjectWithBoolean,
} from 'src/page/tags/types';
import type { ContextInterface } from 'src/shared/context/types';
import { isConsentRequiredButNotGiven } from 'src/shared/database/config';
import {
  ChannelCaptureError,
  ExistingChannelError,
  PermissionBlockedError,
} from 'src/shared/errors/common';
import { InvalidChannelInputField } from 'src/shared/errors/constants';
import { delay } from 'src/shared/helpers/general';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import {
  CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS,
  DelayedPromptType,
} from 'src/shared/prompts/constants';
import { isSlidedownPushDependent } from 'src/shared/prompts/helpers';
import type { DelayedPromptTypeValue } from 'src/shared/prompts/types';
import { logMethodCall } from 'src/shared/utils/utils';
import { CoreModuleDirector } from '../../../core/CoreModuleDirector';
import {
  markPromptDismissedWithType,
  wasPromptOfTypeDismissed,
} from '../../../shared/helpers/DismissHelper';
import Log from '../../../shared/libraries/Log';
import type { PushSubscriptionState } from '../../../shared/models/PushSubscriptionState';
import TagUtils from '../../../shared/utils/TagUtils';
import { DismissPrompt } from '../../models/Dismiss';
import ChannelCaptureContainer from '../../slidedown/ChannelCaptureContainer';
import ConfirmationToast from '../../slidedown/ConfirmationToast';
import Slidedown, {
  manageNotifyButtonStateWhileSlidedownShows,
} from '../../slidedown/Slidedown';
import TaggingContainer from '../../slidedown/TaggingContainer';
import type { AutoPromptOptions } from '../PromptsManager';

export class SlidedownManager {
  private context: ContextInterface;
  private slidedownQueue: AutoPromptOptions[];
  private isSlidedownShowing: boolean;
  slidedown?: Slidedown;

  constructor(context: ContextInterface) {
    this.context = context;
    this.slidedownQueue = [];
    this.isSlidedownShowing = false;
  }

  /* P R I V A T E */

  private async checkIfSlidedownShouldBeShown(
    options: AutoPromptOptions,
  ): Promise<boolean> {
    const permissionDenied =
      (await OneSignal._context._permissionManager.getPermissionStatus()) ===
      'denied';
    let wasDismissed: boolean;

    const subscriptionInfo: PushSubscriptionState =
      await OneSignal._context._subscriptionManager.getSubscriptionState();
    const { subscribed, optedOut } = subscriptionInfo;

    const slidedownType = options.slidedownPromptOptions?.type;

    let _isSlidedownPushDependent = false;

    if (!!slidedownType) {
      _isSlidedownPushDependent = isSlidedownPushDependent(slidedownType);
    }

    // applies to both push and category slidedown types
    if (_isSlidedownPushDependent) {
      if (subscribed) {
        // applies to category slidedown type only
        if (options.isInUpdateMode) {
          return true;
        }

        Log._info(new Error('User is already subscribed'));
        return false;
      }

      wasDismissed = wasPromptOfTypeDismissed(DismissPrompt.Push);

      if (optedOut) {
        throw new Error('User is opted out');
      }

      if (permissionDenied) {
        Log._info(PermissionBlockedError);
        return false;
      }
    } else {
      if (!options.force) {
        const smsSubscribed = await (
          OneSignal._coreDirector as CoreModuleDirector
        ).hasSms();
        const emailSubscribed = await (
          OneSignal._coreDirector as CoreModuleDirector
        ).hasEmail();
        const bothSubscribed = smsSubscribed && emailSubscribed;

        if (smsSubscribed && slidedownType === DelayedPromptType.Sms) {
          Log._info(ExistingChannelError(DelayedPromptType.Sms));
          return false;
        }

        if (emailSubscribed && slidedownType === DelayedPromptType.Email) {
          Log._info(ExistingChannelError(DelayedPromptType.Email));
          return false;
        }

        if (bothSubscribed && slidedownType === DelayedPromptType.SmsAndEmail) {
          Log._info(ExistingChannelError(DelayedPromptType.SmsAndEmail));
          return false;
        }
      }

      wasDismissed = wasPromptOfTypeDismissed(DismissPrompt.NonPush);
    }

    if (wasDismissed && !options.force && !options.isInUpdateMode) {
      Log._info(
        new Error(`${slidedownType || 'unknown'} was previously dismissed`),
      );
      return false;
    }

    return true;
  }

  private async handleAllowForCategoryType(): Promise<void> {
    if (!this.slidedown) {
      throw SlidedownMissingError;
    }

    const tags = TaggingContainer.getValuesFromTaggingContainer();
    this.context._tagManager.storeTagValuesToUpdate(tags);

    registerForPushNotifications();
    await this.context._tagManager.sendTags(true);
  }

  private async handleAllowForEmailType(): Promise<void> {
    if (!this.slidedown) {
      throw SlidedownMissingError;
    }

    const emailInputFieldIsValid =
      this.slidedown.channelCaptureContainer?.emailInputFieldIsValid;
    const isEmailEmpty =
      this.slidedown.channelCaptureContainer?.isEmailInputFieldEmpty();

    if (!emailInputFieldIsValid || isEmailEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidEmail);
    }

    const email =
      this.slidedown.channelCaptureContainer?.getValueFromEmailInput();
    this.updateEmail(email);
  }

  private async handleAllowForSmsType(): Promise<void> {
    if (!this.slidedown) {
      throw SlidedownMissingError;
    }

    const smsInputFieldIsValid =
      this.slidedown.channelCaptureContainer?.smsInputFieldIsValid;
    const isSmsEmpty =
      this.slidedown.channelCaptureContainer?.isSmsInputFieldEmpty();

    if (!smsInputFieldIsValid || isSmsEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField.InvalidSms);
    }

    const sms = this.slidedown.channelCaptureContainer?.getValueFromSmsInput();
    this.updateSMS(sms);
  }

  private async handleAllowForSmsAndEmailType(): Promise<void> {
    if (!this.slidedown) {
      throw SlidedownMissingError;
    }

    const smsInputFieldIsValid =
      this.slidedown.channelCaptureContainer?.smsInputFieldIsValid;
    const emailInputFieldIsValid =
      this.slidedown.channelCaptureContainer?.emailInputFieldIsValid;
    /**
     * empty input fields are considered valid since in the case of two input field types present,
     * we can accept one of the two being left as an empty string.
     *
     * thus, we need separate checks for the emptiness properties
     */
    const isEmailEmpty =
      this.slidedown.channelCaptureContainer?.isEmailInputFieldEmpty();
    const isSmsEmpty =
      this.slidedown.channelCaptureContainer?.isSmsInputFieldEmpty();

    const bothFieldsEmpty = isEmailEmpty && isSmsEmpty;
    const bothFieldsInvalid = !smsInputFieldIsValid && !emailInputFieldIsValid;

    if (bothFieldsInvalid || bothFieldsEmpty) {
      throw new ChannelCaptureError(
        InvalidChannelInputField.InvalidEmailAndSms,
      );
    }

    const email =
      this.slidedown.channelCaptureContainer?.getValueFromEmailInput();
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
      throw SlidedownMissingError;
    }

    const confirmMessage = this.slidedown.options.text.confirmMessage;
    if (!confirmMessage) {
      return;
    }
    await delay(1000);
    const confirmationToast = new ConfirmationToast(confirmMessage);
    await confirmationToast.show();
    await delay(5000);
    confirmationToast.close();
    ConfirmationToast.triggerSlidedownEvent(ConfirmationToast.EVENTS.CLOSED);
  }

  private async mountAuxiliaryContainers(
    options: AutoPromptOptions,
  ): Promise<void> {
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

  private async mountTaggingContainer(
    options: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('mountTaggingContainer');
    try {
      // show slidedown with tagging container
      let tagsForComponent: TagsObjectWithBoolean = {};
      const taggingContainer = new TaggingContainer();
      const categories = options.slidedownPromptOptions?.categories;

      if (!categories) {
        throw new Error('Categories not defined');
      }

      const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
      const existingTags = propertiesModel.tags;

      if (options.isInUpdateMode && existingTags) {
        this.context._tagManager.storeRemotePlayerTags(
          existingTags as TagsObjectForApi,
        );
        tagsForComponent = TagUtils.convertTagsApiToBooleans(
          existingTags as TagsObjectForApi,
        );
      } else {
        // first subscription or no existing tags
        TagUtils.markAllTagsAsSpecified(categories, true);
      }

      taggingContainer.mount(categories, tagsForComponent);
    } catch (e) {
      Log._error(
        'OneSignal: Attempted to create tagging container with error',
        e,
      );
    }
  }

  private async mountChannelCaptureContainer(
    options: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('mountChannelCaptureContainer');
    try {
      if (!!options.slidedownPromptOptions) {
        const channelCaptureContainer = new ChannelCaptureContainer(
          options.slidedownPromptOptions,
        );
        channelCaptureContainer.mount();

        if (this.slidedown) {
          this.slidedown.channelCaptureContainer = channelCaptureContainer;
        }
      }
    } catch (e) {
      Log._error(
        'OneSignal: Attempted to create channel capture container with error',
        e,
      );
    }
  }

  /* P U B L I C */

  public async handleAllowClick(): Promise<void> {
    if (!this.slidedown) {
      throw SlidedownMissingError;
    }
    const slidedownType: DelayedPromptTypeValue = this.slidedown.options.type;

    if (this.slidedown.isShowingFailureState) {
      this.slidedown.removeFailureState();
    }

    try {
      switch (slidedownType) {
        case DelayedPromptType.Push:
          registerForPushNotifications();
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
      Log._warn('OneSignal Slidedown failed to update:', e);
      // Display update error
      this.slidedown.removeSaveState();
      this.slidedown.setFailureState();

      if (e instanceof ChannelCaptureError) {
        this.slidedown.setFailureStateForInvalidChannelInput(e.reason);
      }
      return;
    }

    if (this.slidedown) {
      this.slidedown.close();

      if (!isSlidedownPushDependent(slidedownType)) {
        await this.showConfirmationToast();
      }
      // timeout to allow slidedown close animation to finish in case another slidedown is queued
      await delay(1000);

      Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
    }

    switch (slidedownType) {
      case DelayedPromptType.Push:
      case DelayedPromptType.Category:
        Log._debug('Setting flag to not show the slidedown to the user again.');
        markPromptDismissedWithType(DismissPrompt.Push);
        break;
      default:
        Log._debug('Setting flag to not show the slidedown to the user again.');
        markPromptDismissedWithType(DismissPrompt.NonPush);
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
    logMethodCall('createSlidedown');
    if (isConsentRequiredButNotGiven()) return;
    try {
      const showPrompt = await this.checkIfSlidedownShouldBeShown(options);
      if (!showPrompt) {
        return;
      }
    } catch (e) {
      Log._warn('checkIfSlidedownShouldBeShown returned an error', e);
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
      const slidedownPromptOptions =
        options.slidedownPromptOptions || CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
      this.slidedown = new Slidedown(slidedownPromptOptions);
      await this.slidedown.create(options.isInUpdateMode);
      await this.mountAuxiliaryContainers(options);
      Log._debug('Showing OneSignal Slidedown');
      Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.SHOWN);
    } catch (e) {
      Log._error('There was an error showing the OneSignal Slidedown:', e);
      this.setIsSlidedownShowing(false);
      this.slidedown?.close();
    }
  }
}

const SlidedownMissingError = new Error('Slidedown is missing');
