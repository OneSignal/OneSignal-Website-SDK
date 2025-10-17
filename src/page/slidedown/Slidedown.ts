import { InvalidChannelInputField } from 'src/shared/errors/constants';
import type { InvalidChannelInputFieldValue } from 'src/shared/errors/types';
import {
  addCssClass,
  addDomElement,
  getDomElementOrStub,
  removeCssClass,
  removeDomElement,
} from 'src/shared/helpers/dom';
import { getValueOrDefault } from 'src/shared/helpers/general';
import MainHelper from 'src/shared/helpers/MainHelper';
import type { NotificationIcons } from 'src/shared/notifications/types';
import {
  DelayedPromptType,
  SERVER_CONFIG_DEFAULTS_SLIDEDOWN,
} from 'src/shared/prompts/constants';
import { isSlidedownPushDependent } from 'src/shared/prompts/helpers';
import type { SlidedownPromptOptions } from 'src/shared/prompts/types';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import {
  COLORS,
  SLIDEDOWN_CSS_CLASSES,
  SLIDEDOWN_CSS_IDS,
} from 'src/shared/slidedown/constants';
import { isMobileBrowser } from 'src/shared/useragent/detect';
import { getPlatformNotificationIcon, once } from 'src/shared/utils/utils';
import type { TagCategory } from '../tags/types';
import ChannelCaptureContainer from './ChannelCaptureContainer';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';
import { getRetryIndicator } from './RetryIndicator';
import { getSlidedownElement } from './SlidedownElement';

export default class Slidedown {
  public _options: SlidedownPromptOptions;
  public _notificationIcons: NotificationIcons | null;
  public _channelCaptureContainer: ChannelCaptureContainer | null;

  // category slidedown
  public _isShowingFailureState: boolean;
  private _tagCategories: TagCategory[] | undefined;
  private _savingButton: string = SERVER_CONFIG_DEFAULTS_SLIDEDOWN.savingText;
  private _errorButton: string = SERVER_CONFIG_DEFAULTS_SLIDEDOWN.errorButton;
  private _updateMessage?: string;
  private _positiveUpdateButton?: string;
  private _negativeUpdateButton?: string;

  constructor(options: SlidedownPromptOptions) {
    this._options = options;
    this._options.text.actionMessage = options.text.actionMessage.substring(
      0,
      90,
    );
    this._options.text.acceptButton = options.text.acceptButton.substring(
      0,
      16,
    );
    this._options.text.cancelButton = options.text.cancelButton.substring(
      0,
      16,
    );
    this._notificationIcons = null;
    this._channelCaptureContainer = null;
    this._isShowingFailureState = false;

    switch (options.type) {
      case DelayedPromptType._Category:
        this._negativeUpdateButton =
          this._options.text.negativeUpdateButton?.substring(0, 16);
        this._positiveUpdateButton =
          this._options.text.positiveUpdateButton?.substring(0, 16);
        this._updateMessage = this._options.text.updateMessage?.substring(
          0,
          90,
        );
        this._tagCategories = options.categories;
        this._errorButton = getValueOrDefault(
          this._options.text.positiveUpdateButton,
          SERVER_CONFIG_DEFAULTS_SLIDEDOWN.errorButton,
        );
        break;
      case DelayedPromptType._Sms:
      case DelayedPromptType._Email:
      case DelayedPromptType._SmsAndEmail:
        this._errorButton = getValueOrDefault(
          this._options.text.acceptButton,
          SERVER_CONFIG_DEFAULTS_SLIDEDOWN.errorButton,
        );
        break;
      default:
        break;
    }
  }

  async _create(isInUpdateMode?: boolean): Promise<void> {
    // TODO: dynamically change btns depending on if its first or repeat display of slidedown (subscribe vs update)
    if (this._notificationIcons === null) {
      const icons = await MainHelper._getNotificationIcons();

      this._notificationIcons = icons;

      // Remove any existing container
      if (this._container.className.includes(SLIDEDOWN_CSS_CLASSES.container)) {
        removeDomElement(`#${SLIDEDOWN_CSS_IDS.container}`);
      }
      const positiveButtonText =
        isInUpdateMode && !!this._tagCategories
          ? this._positiveUpdateButton
          : this._options.text.acceptButton;
      const negativeButtonText =
        isInUpdateMode && !!this._tagCategories
          ? this._negativeUpdateButton
          : this._options.text.cancelButton;
      const messageText =
        isInUpdateMode && !!this._tagCategories
          ? this._updateMessage
          : this._options.text.actionMessage;

      // use the prompt-specific icon OR the app default icon
      const icon = this._options.icon || this._getPlatformNotificationIcon();
      const slidedownElement = getSlidedownElement({
        messageText,
        icon,
        positiveButtonText,
        negativeButtonText,
      });

      const slidedownContainer = document.createElement('div');
      const dialogContainer = document.createElement('div');

      // Insert the container
      slidedownContainer.id = SLIDEDOWN_CSS_IDS.container;
      addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES.container);
      addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES.reset);
      getDomElementOrStub('body').appendChild(slidedownContainer);

      // Insert the dialog
      dialogContainer.id = SLIDEDOWN_CSS_IDS.dialog;
      addCssClass(dialogContainer, SLIDEDOWN_CSS_CLASSES.dialog);
      dialogContainer.appendChild(slidedownElement);
      this._container.appendChild(dialogContainer);

      // Animate it in depending on environment
      addCssClass(
        this._container,
        isMobileBrowser()
          ? SLIDEDOWN_CSS_CLASSES.slideUp
          : SLIDEDOWN_CSS_CLASSES.slideDown,
      );

      // Add click event handlers
      this._allowButton.addEventListener(
        'click',
        this._onSlidedownAllowed.bind(this),
      );
      this._cancelButton.addEventListener(
        'click',
        this._onSlidedownCanceled.bind(this),
      );
    }
  }

  static async _triggerSlidedownEvent(eventName: string): Promise<void> {
    await OneSignalEvent._trigger(eventName);
  }

  async _onSlidedownAllowed(_: any): Promise<void> {
    await Slidedown._triggerSlidedownEvent(Slidedown.EVENTS.ALLOW_CLICK);
  }

  _onSlidedownCanceled(_: any): void {
    Slidedown._triggerSlidedownEvent(Slidedown.EVENTS.CANCEL_CLICK);
    this._close();
    Slidedown._triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
  }

  _close(): void {
    addCssClass(this._container, SLIDEDOWN_CSS_CLASSES.closeSlidedown);
    once(
      this._dialog,
      'animationend',
      (event: any, destroyListenerFn: () => void) => {
        if (
          event.target === this._dialog &&
          (event.animationName === 'slideDownExit' ||
            event.animationName === 'slideUpExit')
        ) {
          // Uninstall the event listener for animationend
          removeDomElement(`#${SLIDEDOWN_CSS_IDS.container}`);
          destroyListenerFn();

          /**
           * Remember to trigger closed event after invoking close()
           * This is due to the once() function not running correctly in test environment
           */
        }
      },
      true,
    );
  }

  /**
   * To be used with slidedown types other than `push` type
   */
  _setSaveState(): void {
    // note: savingButton is hardcoded in constructor. TODO: pull from config & set defaults for future release
    this._allowButton.disabled = true;
    this._allowButton.textContent = null;

    this._allowButton.insertAdjacentElement(
      'beforeend',
      this._getTextSpan(this._savingButton),
    );
    this._allowButton.insertAdjacentElement(
      'beforeend',
      this._getIndicatorHolder(),
    );

    addDomElement(
      this._buttonIndicatorHolder,
      'beforeend',
      getLoadingIndicatorWithColor(COLORS.whiteLoadingIndicator),
    );
    addCssClass(this._allowButton, 'disabled');
    addCssClass(this._allowButton, SLIDEDOWN_CSS_CLASSES.savingStateButton);
  }

  /**
   * To be used with slidedown types other than `push` type
   */
  _removeSaveState(): void {
    this._allowButton.textContent = this._positiveUpdateButton ?? '';
    removeDomElement(`#${SLIDEDOWN_CSS_CLASSES.buttonIndicatorHolder}`);
    this._allowButton.disabled = false;
    removeCssClass(this._allowButton, 'disabled');
    removeCssClass(this._allowButton, SLIDEDOWN_CSS_CLASSES.savingStateButton);
  }

  /**
   * @param  {InvalidChannelInputField} invalidChannelInput? - for use in Web Prompts only!
   *    we want the ability to be able to specify which channel input failed validation
   * @returns void
   */
  _setFailureState(): void {
    this._allowButton.textContent = null;
    this._allowButton.insertAdjacentElement(
      'beforeend',
      this._getTextSpan(this._errorButton),
    );

    if (this._options.type === DelayedPromptType._Category) {
      this._allowButton.insertAdjacentElement(
        'beforeend',
        this._getIndicatorHolder(),
      );
      addDomElement(
        this._buttonIndicatorHolder,
        'beforeend',
        getRetryIndicator(),
      );
      addCssClass(this._allowButton, 'onesignal-error-state-button');
    }

    this._isShowingFailureState = true;
  }

  _setFailureStateForInvalidChannelInput(
    invalidChannelInput: InvalidChannelInputFieldValue,
  ): void {
    switch (invalidChannelInput) {
      case InvalidChannelInputField.InvalidSms:
        ChannelCaptureContainer._showSmsInputError(true);
        break;
      case InvalidChannelInputField.InvalidEmail:
        ChannelCaptureContainer._showEmailInputError(true);
        break;
      case InvalidChannelInputField.InvalidEmailAndSms:
        ChannelCaptureContainer._showSmsInputError(true);
        ChannelCaptureContainer._showEmailInputError(true);
        break;
      default:
        break;
    }
  }

  _removeFailureState(): void {
    removeDomElement('#onesignal-button-indicator-holder');
    removeCssClass(this._allowButton, 'onesignal-error-state-button');

    if (!isSlidedownPushDependent(this._options.type)) {
      ChannelCaptureContainer._resetInputErrorStates(this._options.type);
    }

    this._isShowingFailureState = false;
  }

  _getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this._notificationIcons);
  }

  _getIndicatorHolder(): Element {
    const indicatorHolder = document.createElement('div');
    indicatorHolder.id = SLIDEDOWN_CSS_IDS.buttonIndicatorHolder;
    addCssClass(indicatorHolder, SLIDEDOWN_CSS_CLASSES.buttonIndicatorHolder);
    return indicatorHolder;
  }

  _getTextSpan(text: string): Element {
    const textHolder = document.createElement('span');
    textHolder.textContent = text;
    return textHolder;
  }

  get _container() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.container}`);
  }

  get _dialog() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.dialog}`);
  }

  get _allowButton() {
    return getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS.allowButton}`,
    ) as HTMLButtonElement;
  }

  get _cancelButton() {
    return getDomElementOrStub(
      `#${SLIDEDOWN_CSS_IDS.cancelButton}`,
    ) as HTMLButtonElement;
  }

  get _buttonIndicatorHolder() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.buttonIndicatorHolder}`);
  }

  get _slidedownFooter() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.footer}`);
  }

  static get EVENTS() {
    return {
      ALLOW_CLICK: 'slidedownAllowClick',
      CANCEL_CLICK: 'slidedownCancelClick',
      SHOWN: 'slidedownShown',
      CLOSED: 'slidedownClosed',
      QUEUED: 'slidedownQueued',
    };
  }
}

export function manageNotifyButtonStateWhileSlidedownShows(): void {
  const notifyButton = OneSignal._notifyButton;
  if (
    notifyButton &&
    notifyButton._options?.enable &&
    OneSignal._notifyButton?._launcher?._shown
  ) {
    OneSignal._notifyButton?._launcher?._show().then(() => {
      OneSignal._notifyButton?._launcher?._hide();
    });
  }
  OneSignal._emitter.once(Slidedown.EVENTS.CLOSED, () => {
    if (OneSignal._notifyButton && OneSignal._notifyButton._options.enable) {
      OneSignal._notifyButton._launcher._show();
    }
  });
}
