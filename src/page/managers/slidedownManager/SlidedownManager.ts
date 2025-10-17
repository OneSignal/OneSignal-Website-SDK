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
import {
  convertTagsApiToBooleans,
  markAllTagsAsSpecified,
} from 'src/shared/utils/tags';
import { logMethodCall } from 'src/shared/utils/utils';
import { CoreModuleDirector } from '../../../core/CoreModuleDirector';
import {
  markPromptDismissedWithType,
  wasPromptOfTypeDismissed,
} from '../../../shared/helpers/dismiss';
import Log from '../../../shared/libraries/Log';
import type { PushSubscriptionState } from '../../../shared/models/PushSubscriptionState';
import { DismissPrompt } from '../../models/Dismiss';
import ChannelCaptureContainer from '../../slidedown/ChannelCaptureContainer';
import ConfirmationToast from '../../slidedown/ConfirmationToast';
import Slidedown, {
  manageNotifyButtonStateWhileSlidedownShows,
} from '../../slidedown/Slidedown';
import TaggingContainer from '../../slidedown/TaggingContainer';
import type { AutoPromptOptions } from '../PromptsManager';

export class SlidedownManager {
  private _context: ContextInterface;
  private _slidedownQueue: AutoPromptOptions[];
  private _isSlidedownShowing: boolean;
  _slidedown?: Slidedown;

  constructor(context: ContextInterface) {
    this._context = context;
    this._slidedownQueue = [];
    this._isSlidedownShowing = false;
  }

  /* P R I V A T E */
  private async _checkIfSlidedownShouldBeShown(
    options: AutoPromptOptions,
  ): Promise<boolean> {
    const permissionDenied =
      (await OneSignal._context._permissionManager._getPermissionStatus()) ===
      'denied';
    let wasDismissed: boolean;

    const subscriptionInfo: PushSubscriptionState =
      await OneSignal._context._subscriptionManager._getSubscriptionState();
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

      wasDismissed = wasPromptOfTypeDismissed(DismissPrompt._Push);

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
        )._hasSms();
        const emailSubscribed = await (
          OneSignal._coreDirector as CoreModuleDirector
        )._hasEmail();
        const bothSubscribed = smsSubscribed && emailSubscribed;

        if (smsSubscribed && slidedownType === DelayedPromptType._Sms) {
          Log._info(ExistingChannelError(DelayedPromptType._Sms));
          return false;
        }

        if (emailSubscribed && slidedownType === DelayedPromptType._Email) {
          Log._info(ExistingChannelError(DelayedPromptType._Email));
          return false;
        }

        if (
          bothSubscribed &&
          slidedownType === DelayedPromptType._SmsAndEmail
        ) {
          Log._info(ExistingChannelError(DelayedPromptType._SmsAndEmail));
          return false;
        }
      }

      wasDismissed = wasPromptOfTypeDismissed(DismissPrompt._NonPush);
    }

    if (wasDismissed && !options.force && !options.isInUpdateMode) {
      Log._info(
        new Error(`${slidedownType || 'unknown'} was previously dismissed`),
      );
      return false;
    }

    return true;
  }

  private async _handleAllowForCategoryType(): Promise<void> {
    if (!this._slidedown) {
      throw SlidedownMissingError;
    }

    const tags = TaggingContainer._getValuesFromTaggingContainer();
    this._context._tagManager._storeTagValuesToUpdate(tags);

    registerForPushNotifications();
    await this._context._tagManager._sendTags(true);
  }

  private async _handleAllowForEmailType(): Promise<void> {
    if (!this._slidedown) {
      throw SlidedownMissingError;
    }

    const emailInputFieldIsValid =
      this._slidedown._channelCaptureContainer?._emailInputFieldIsValid;
    const isEmailEmpty =
      this._slidedown._channelCaptureContainer?._isEmailInputFieldEmpty();

    if (!emailInputFieldIsValid || isEmailEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField._InvalidEmail);
    }

    const email =
      this._slidedown._channelCaptureContainer?._getValueFromEmailInput();
    this._updateEmail(email);
  }

  private async _handleAllowForSmsType(): Promise<void> {
    if (!this._slidedown) {
      throw SlidedownMissingError;
    }

    const smsInputFieldIsValid =
      this._slidedown._channelCaptureContainer?._smsInputFieldIsValid;
    const isSmsEmpty =
      this._slidedown._channelCaptureContainer?._isSmsInputFieldEmpty();

    if (!smsInputFieldIsValid || isSmsEmpty) {
      throw new ChannelCaptureError(InvalidChannelInputField._InvalidSms);
    }

    const sms =
      this._slidedown._channelCaptureContainer?._getValueFromSmsInput();
    this._updateSMS(sms);
  }

  private async _handleAllowForSmsAndEmailType(): Promise<void> {
    if (!this._slidedown) {
      throw SlidedownMissingError;
    }

    const smsInputFieldIsValid =
      this._slidedown._channelCaptureContainer?._smsInputFieldIsValid;
    const emailInputFieldIsValid =
      this._slidedown._channelCaptureContainer?._emailInputFieldIsValid;
    /**
     * empty input fields are considered valid since in the case of two input field types present,
     * we can accept one of the two being left as an empty string.
     *
     * thus, we need separate checks for the emptiness properties
     */
    const isEmailEmpty =
      this._slidedown._channelCaptureContainer?._isEmailInputFieldEmpty();
    const isSmsEmpty =
      this._slidedown._channelCaptureContainer?._isSmsInputFieldEmpty();

    const bothFieldsEmpty = isEmailEmpty && isSmsEmpty;
    const bothFieldsInvalid = !smsInputFieldIsValid && !emailInputFieldIsValid;

    if (bothFieldsInvalid || bothFieldsEmpty) {
      throw new ChannelCaptureError(
        InvalidChannelInputField._InvalidEmailAndSms,
      );
    }

    const email =
      this._slidedown._channelCaptureContainer?._getValueFromEmailInput();
    const sms =
      this._slidedown._channelCaptureContainer?._getValueFromSmsInput();

    /**
     * empty is ok (we can accept only one of two input fields), but invalid is not
     * at least one field is valid and non-empty
     */
    if (emailInputFieldIsValid) {
      if (!isEmailEmpty) {
        this._updateEmail(email);
      }
    } else {
      throw new ChannelCaptureError(InvalidChannelInputField._InvalidEmail);
    }

    if (smsInputFieldIsValid) {
      if (!isSmsEmpty) {
        this._updateSMS(sms);
      }
    } else {
      throw new ChannelCaptureError(InvalidChannelInputField._InvalidSms);
    }
  }

  private _updateEmail(email?: string): void {
    if (!email) {
      return;
    }
    OneSignal.User.addEmail(email);
  }

  private _updateSMS(sms?: string): void {
    if (!sms) {
      return;
    }
    OneSignal.User.addSms(sms);
  }

  private async _showConfirmationToast(): Promise<void> {
    if (!this._slidedown) {
      throw SlidedownMissingError;
    }

    const confirmMessage = this._slidedown._options.text.confirmMessage;
    if (!confirmMessage) {
      return;
    }
    await delay(1000);
    const confirmationToast = new ConfirmationToast(confirmMessage);
    await confirmationToast._show();
    await delay(5000);
    confirmationToast._close();
    ConfirmationToast._triggerSlidedownEvent(ConfirmationToast.EVENTS.CLOSED);
  }

  private async _mountAuxiliaryContainers(
    options: AutoPromptOptions,
  ): Promise<void> {
    switch (options.slidedownPromptOptions?.type) {
      case DelayedPromptType._Category:
        this._mountTaggingContainer(options);
        break;
      case DelayedPromptType._Email:
      case DelayedPromptType._Sms:
      case DelayedPromptType._SmsAndEmail:
        await this._mountChannelCaptureContainer(options);
        break;
      default:
        break;
    }
  }

  private async _mountTaggingContainer(
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
      const existingTags = propertiesModel._tags;

      if (options.isInUpdateMode && existingTags) {
        this._context._tagManager._storeRemotePlayerTags(
          existingTags as TagsObjectForApi,
        );
        tagsForComponent = convertTagsApiToBooleans(
          existingTags as TagsObjectForApi,
        );
      } else {
        // first subscription or no existing tags
        markAllTagsAsSpecified(categories, true);
      }

      taggingContainer._mount(categories, tagsForComponent);
    } catch (e) {
      Log._error(
        'OneSignal: Attempted to create tagging container with error',
        e,
      );
    }
  }

  private async _mountChannelCaptureContainer(
    options: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('mountChannelCaptureContainer');
    try {
      if (!!options.slidedownPromptOptions) {
        const channelCaptureContainer = new ChannelCaptureContainer(
          options.slidedownPromptOptions,
        );
        channelCaptureContainer._mount();

        if (this._slidedown) {
          this._slidedown._channelCaptureContainer = channelCaptureContainer;
        }
      }
    } catch (e) {
      Log._error(
        'OneSignal: Attempted to create channel capture container with error',
        e,
      );
    }
  }

  public async _handleAllowClick(): Promise<void> {
    if (!this._slidedown) {
      throw SlidedownMissingError;
    }
    const slidedownType: DelayedPromptTypeValue = this._slidedown._options.type;

    if (this._slidedown._isShowingFailureState) {
      this._slidedown._removeFailureState();
    }

    try {
      switch (slidedownType) {
        case DelayedPromptType._Push:
          registerForPushNotifications();
          break;
        case DelayedPromptType._Category:
          await this._handleAllowForCategoryType();
          break;
        case DelayedPromptType._Email:
          await this._handleAllowForEmailType();
          break;
        case DelayedPromptType._Sms:
          await this._handleAllowForSmsType();
          break;
        case DelayedPromptType._SmsAndEmail:
          await this._handleAllowForSmsAndEmailType();
          break;
        default:
          break;
      }
    } catch (e) {
      Log._warn('OneSignal Slidedown failed to update:', e);
      // Display update error
      this._slidedown._removeSaveState();
      this._slidedown._setFailureState();

      if (e instanceof ChannelCaptureError) {
        this._slidedown._setFailureStateForInvalidChannelInput(e.reason);
      }
      return;
    }

    if (this._slidedown) {
      this._slidedown._close();

      if (!isSlidedownPushDependent(slidedownType)) {
        await this._showConfirmationToast();
      }
      // timeout to allow slidedown close animation to finish in case another slidedown is queued
      await delay(1000);

      Slidedown._triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
    }

    switch (slidedownType) {
      case DelayedPromptType._Push:
      case DelayedPromptType._Category:
        Log._debug('Setting flag to not show the slidedown to the user again.');
        markPromptDismissedWithType(DismissPrompt._Push);
        break;
      default:
        Log._debug('Setting flag to not show the slidedown to the user again.');
        markPromptDismissedWithType(DismissPrompt._NonPush);
        break;
    }
  }

  public _setIsSlidedownShowing(isShowing: boolean): void {
    this._isSlidedownShowing = isShowing;
  }

  public async _showQueued(): Promise<void> {
    if (this._slidedownQueue.length > 0) {
      const options = this._dequeue();

      if (!!options) {
        await this._createSlidedown(options);
      }
    }
  }

  public _enqueue(options: AutoPromptOptions): void {
    this._slidedownQueue.push(options);
    Slidedown._triggerSlidedownEvent(Slidedown.EVENTS.QUEUED);
  }

  public _dequeue(): AutoPromptOptions | undefined {
    return this._slidedownQueue.shift();
  }

  public async _createSlidedown(options: AutoPromptOptions): Promise<void> {
    logMethodCall('createSlidedown');
    if (isConsentRequiredButNotGiven()) return;
    try {
      const showPrompt = await this._checkIfSlidedownShouldBeShown(options);
      if (!showPrompt) {
        return;
      }
    } catch (e) {
      Log._warn('checkIfSlidedownShouldBeShown returned an error', e);
      return;
    }

    manageNotifyButtonStateWhileSlidedownShows();

    if (this._isSlidedownShowing) {
      // already showing, enqueue
      this._enqueue(options);
      return;
    }

    try {
      this._setIsSlidedownShowing(true);
      const slidedownPromptOptions =
        options.slidedownPromptOptions || CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
      this._slidedown = new Slidedown(slidedownPromptOptions);
      await this._slidedown._create(options.isInUpdateMode);
      await this._mountAuxiliaryContainers(options);
      Log._debug('Showing OneSignal Slidedown');
      Slidedown._triggerSlidedownEvent(Slidedown.EVENTS.SHOWN);
    } catch (e) {
      Log._error('There was an error showing the OneSignal Slidedown:', e);
      this._setIsSlidedownShowing(false);
      this._slidedown?._close();
    }
  }
}

const SlidedownMissingError = new Error('Slidedown is missing');
