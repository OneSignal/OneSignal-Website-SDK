import bowser from 'bowser';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import {
  addCssClass,
  addDomElement,
  getPlatformNotificationIcon,
  once,
  removeDomElement,
  removeCssClass,
  getDomElementOrStub
} from '../utils';
import {
  SlidedownPromptOptions,
  DelayedPromptType
} from '../models/Prompts';
import { SERVER_CONFIG_DEFAULTS_SLIDEDOWN } from '../config';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';
import { getRetryIndicator } from './RetryIndicator';
import { SLIDEDOWN_CSS_CLASSES, SLIDEDOWN_CSS_IDS, COLORS } from "./constants";
import { TagCategory } from '../models/Tags';
import { getSlidedownElement } from './SlidedownElement';
import { Utils } from '../context/shared/utils/Utils';
import ChannelCaptureContainer from './ChannelCaptureContainer';
import { InvalidChannelInputField } from '../errors/ChannelCaptureError';
import PromptsHelper from '../helpers/PromptsHelper';

export default class Slidedown {
  public options: SlidedownPromptOptions;
  public notificationIcons: NotificationIcons | null;
  public channelCaptureContainer: ChannelCaptureContainer | null;

  // category slidedown
  public isShowingFailureState: boolean;
  private tagCategories          : TagCategory[] | undefined;
  private savingButton           : string = SERVER_CONFIG_DEFAULTS_SLIDEDOWN.savingText;
  private errorButton            : string = SERVER_CONFIG_DEFAULTS_SLIDEDOWN.errorButton;
  private updateMessage         ?: string;
  private positiveUpdateButton  ?: string;
  private negativeUpdateButton  ?: string;

  constructor(options: SlidedownPromptOptions) {
    this.options                    = options;
    this.options.text.actionMessage = options.text.actionMessage.substring(0, 90);
    this.options.text.acceptButton  = options.text.acceptButton.substring(0, 16);
    this.options.text.cancelButton  = options.text.cancelButton.substring(0, 16);
    this.notificationIcons          = null;
    this.channelCaptureContainer    = null;
    this.isShowingFailureState      = false;

    switch (options.type) {
      case DelayedPromptType.Category:
        this.negativeUpdateButton = this.options.text.negativeUpdateButton?.substring(0, 16);
        this.positiveUpdateButton = this.options.text.positiveUpdateButton?.substring(0, 16);
        this.updateMessage        = this.options.text.updateMessage?.substring(0, 90);
        this.tagCategories        = options.categories;
        this.errorButton          = Utils.getValueOrDefault(this.options.text.positiveUpdateButton,
          SERVER_CONFIG_DEFAULTS_SLIDEDOWN.errorButton);
        break;
      case DelayedPromptType.Sms:
      case DelayedPromptType.Email:
      case DelayedPromptType.SmsAndEmail:
        this.errorButton = Utils.getValueOrDefault(this.options.text.acceptButton,
          SERVER_CONFIG_DEFAULTS_SLIDEDOWN.errorButton);
        break;
      default:
        break;
    }
  }

  async create(isInUpdateMode?: boolean): Promise<void> {
    // TODO: dynamically change btns depending on if its first or repeat display of slidedown (subscribe vs update)
    if (this.notificationIcons === null) {
      const icons = await MainHelper.getNotificationIcons();

      this.notificationIcons = icons;

      // Remove any existing container
      if (this.container.className.includes(SLIDEDOWN_CSS_CLASSES.container)) {
          removeDomElement(`#${SLIDEDOWN_CSS_IDS.container}`);
      }
      const positiveButtonText = isInUpdateMode && !!this.tagCategories ?
        this.positiveUpdateButton : this.options.text.acceptButton;
      const negativeButtonText = isInUpdateMode && !!this.tagCategories ?
        this.negativeUpdateButton : this.options.text.cancelButton;
      const messageText = isInUpdateMode && !!this.tagCategories ?
        this.updateMessage : this.options.text.actionMessage;

      const icon = this.getPlatformNotificationIcon();
      const slidedownElement = getSlidedownElement({
        messageText,
        icon,
        positiveButtonText,
        negativeButtonText
      });

      const slidedownContainer = document.createElement("div");
      const dialogContainer = document.createElement("div");

      // Insert the container
      slidedownContainer.id = SLIDEDOWN_CSS_IDS.container;
      addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES.container);
      addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES.reset);
      getDomElementOrStub('body').appendChild(slidedownContainer);

      // Insert the dialog
      dialogContainer.id = SLIDEDOWN_CSS_IDS.dialog;
      addCssClass(dialogContainer, SLIDEDOWN_CSS_CLASSES.dialog);
      dialogContainer.appendChild(slidedownElement);
      this.container.appendChild(dialogContainer);

      // Animate it in depending on environment
      addCssClass(this.container, bowser.mobile ? SLIDEDOWN_CSS_CLASSES.slideUp : SLIDEDOWN_CSS_CLASSES.slideDown);

      // Add click event handlers
      this.allowButton.addEventListener('click', this.onSlidedownAllowed.bind(this));
      this.cancelButton.addEventListener('click', this.onSlidedownCanceled.bind(this));
    }
  }

  static async triggerSlidedownEvent(eventName: string): Promise<void> {
    await Event.trigger(eventName);
  }

  async onSlidedownAllowed(_: any): Promise<void> {
    await Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.ALLOW_CLICK);
  }

  onSlidedownCanceled(_: any): void {
    Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CANCEL_CLICK);
    this.close();
    Slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
  }

  close(): void {
    addCssClass(this.container, SLIDEDOWN_CSS_CLASSES.closeSlidedown);
    once(this.dialog, 'animationend', (event: any, destroyListenerFn: () => void) => {
      if (event.target === this.dialog &&
        (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
          // Uninstall the event listener for animationend
          removeDomElement(`#${SLIDEDOWN_CSS_IDS.container}`);
          destroyListenerFn();

          /**
           * Remember to trigger closed event after invoking close()
           * This is due to the once() function not running correctly in test environment
           */
      }
    }, true);
  }

  /**
   * To be used with slidedown types other than `push` type
   */
  setSaveState(): void {
    // note: savingButton is hardcoded in constructor. TODO: pull from config & set defaults for future release
    this.allowButton.disabled = true;
    this.allowButton.textContent = null;

    this.allowButton.insertAdjacentElement('beforeend', this.getTextSpan(this.savingButton));
    this.allowButton.insertAdjacentElement('beforeend', this.getIndicatorHolder());

    addDomElement(this.buttonIndicatorHolder,'beforeend', getLoadingIndicatorWithColor(COLORS.whiteLoadingIndicator));
    addCssClass(this.allowButton, 'disabled');
    addCssClass(this.allowButton, SLIDEDOWN_CSS_CLASSES.savingStateButton);
  }

  /**
   * To be used with slidedown types other than `push` type
   */
  removeSaveState(): void {
    this.allowButton.textContent = this.positiveUpdateButton;
    removeDomElement(`#${SLIDEDOWN_CSS_CLASSES.buttonIndicatorHolder}`);
    this.allowButton.disabled = false;
    removeCssClass(this.allowButton, 'disabled');
    removeCssClass(this.allowButton, SLIDEDOWN_CSS_CLASSES.savingStateButton);
  }

  /**
   * @param  {InvalidChannelInputField} invalidChannelInput? - for use in Web Prompts only!
   *    we want the ability to be able to specify which channel input failed validation
   * @returns void
   */
  setFailureState(): void {
    this.allowButton.textContent = null;
    this.allowButton.insertAdjacentElement('beforeend', this.getTextSpan(this.errorButton));

    if (this.options.type === DelayedPromptType.Category) {
      this.allowButton.insertAdjacentElement('beforeend', this.getIndicatorHolder());
      addDomElement(this.buttonIndicatorHolder, 'beforeend', getRetryIndicator());
      addCssClass(this.allowButton, 'onesignal-error-state-button');
    }

    this.isShowingFailureState = true;
  }

  setFailureStateForInvalidChannelInput(invalidChannelInput: InvalidChannelInputField): void {
    switch (invalidChannelInput) {
      case InvalidChannelInputField.InvalidSms:
        ChannelCaptureContainer.showSmsInputError(true);
        break;
      case InvalidChannelInputField.InvalidEmail:
        ChannelCaptureContainer.showEmailInputError(true);
        break;
      case InvalidChannelInputField.InvalidEmailAndSms:
        ChannelCaptureContainer.showSmsInputError(true);
        ChannelCaptureContainer.showEmailInputError(true);
        break;
      default:
        break;
      }
  }

  removeFailureState(): void {
    removeDomElement('#onesignal-button-indicator-holder');
    removeCssClass(this.allowButton, 'onesignal-error-state-button');

    if (!PromptsHelper.isSlidedownPushDependent(this.options.type)) {
      ChannelCaptureContainer.resetInputErrorStates(this.options.type);
    }

    this.isShowingFailureState = false;
  }

  getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this.notificationIcons);
  }

  getIndicatorHolder(): Element {
    const indicatorHolder = document.createElement("div");
    indicatorHolder.id = SLIDEDOWN_CSS_IDS.buttonIndicatorHolder;
    addCssClass(indicatorHolder, SLIDEDOWN_CSS_CLASSES.buttonIndicatorHolder);
    return indicatorHolder;
  }

  getTextSpan(text: string): Element {
    const textHolder = document.createElement("span");
    textHolder.textContent = text;
    return textHolder;
  }

  get container() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.container}`);
  }

  get dialog() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.dialog}`);
  }

  get allowButton() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.allowButton}`) as HTMLButtonElement;
  }

  get cancelButton() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.cancelButton}`) as HTMLButtonElement;
  }

  get buttonIndicatorHolder() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.buttonIndicatorHolder}`);
  }

  get slidedownFooter() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.footer}`);
  }

  static get EVENTS() {
    return {
      ALLOW_CLICK: 'popoverAllowClick',
      CANCEL_CLICK: 'popoverCancelClick',
      SHOWN: 'popoverShown',
      CLOSED: 'popoverClosed',
      QUEUED: 'popoverQueued'
    };
  }
}

export function manageNotifyButtonStateWhileSlidedownShows(): void {
  const notifyButton = OneSignal.notifyButton;
  if (notifyButton &&
    notifyButton.options.enable &&
    OneSignal.notifyButton.launcher.state !== 'hidden') {
    OneSignal.notifyButton.launcher.waitUntilShown()
      .then(() => {
        OneSignal.notifyButton.launcher.hide();
      });
  }
  OneSignal.emitter.once(Slidedown.EVENTS.CLOSED, () => {
    if (OneSignal.notifyButton &&
      OneSignal.notifyButton.options.enable) {
      OneSignal.notifyButton.launcher.show();
    }
  });
}
