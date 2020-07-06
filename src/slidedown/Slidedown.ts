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
  getDomElementOrStub } from '../utils';
import { SlidedownPermissionMessageOptions } from '../models/Prompts';
import { SERVER_CONFIG_DEFAULTS_SLIDEDOWN } from '../config';
import getLoadingIndicatorWithColor from './LoadingIndicator';
import getDialogHTML from './DialogHTML';
import sanitizeHtml from 'sanitize-html';
import getRetryIndicator from './RetryIndicator';

export default class Slidedown {
  public options: SlidedownPermissionMessageOptions;
  public notificationIcons: NotificationIcons | null;
  private isInSaveState: boolean;
  public isShowingFailureState: boolean;

  static get EVENTS() {
    return {
      ALLOW_CLICK: 'slidedownAllowClick',
      CANCEL_CLICK: 'slidedownCancelClick',
      SHOWN: 'slidedownShown',
      CLOSED: 'slidedownClosed',
    };
  }

  constructor(options?: SlidedownPermissionMessageOptions) {
    if (!options) {
        options = MainHelper.getSlidedownPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);
    }
    this.options = options;
    this.options.actionMessage = sanitizeHtml(options.actionMessage.substring(0, 90));
    this.options.acceptButtonText = sanitizeHtml(options.acceptButtonText.substring(0, 16));
    this.options.cancelButtonText = sanitizeHtml(options.cancelButtonText.substring(0, 16));
    this.options.positiveUpdateButton = options.positiveUpdateButton ?
      sanitizeHtml(options.positiveUpdateButton).substring(0, 16):
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.positiveUpdateButton;
    this.options.negativeUpdateButton = options.negativeUpdateButton ?
      sanitizeHtml(options.negativeUpdateButton).substring(0, 16) :
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.negativeUpdateButton;
    this.options.updateMessage = !!options.updateMessage ? sanitizeHtml(options.updateMessage).substring(0, 90) :
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.updateMessage;
    this.options.savingButtonText = "Saving...";
    this.options.errorButtonText = this.options.positiveUpdateButton; // configurable in the future

    this.notificationIcons = null;
    this.isInSaveState = false;
    this.isShowingFailureState = false;
  }

  async create(isInUpdateMode?: boolean) {
    // TO DO: dynamically change btns depending on if its first or repeat display of slidedown (subscribe vs update)
    if (this.notificationIcons === null) {
      const icons = await MainHelper.getNotificationIcons();

      this.notificationIcons = icons;

      // Remove any existing container
      if (this.container.className.includes("onesignal-slidedown-container")) {
          removeDomElement('#onesignal-slidedown-container');
      }
      const positiveButtonText = isInUpdateMode ?
        this.options.positiveUpdateButton : this.options.acceptButtonText;
      const negativeButtonText = isInUpdateMode ?
        this.options.negativeUpdateButton : this.options.cancelButtonText;
      const messageText = isInUpdateMode ?
        this.options.updateMessage : this.options.actionMessage;

      const icon = this.getPlatformNotificationIcon();
      const dialogHtml = getDialogHTML({
        messageText,
        icon,
        positiveButtonText,
        negativeButtonText
      });

      // Insert the container
      addDomElement('body', 'beforeend',
          '<div id="onesignal-slidedown-container" class="onesignal-slidedown-container onesignal-reset"></div>');
      // Insert the dialog
      addDomElement(this.container, 'beforeend',
          `<div id="onesignal-slidedown-dialog" class="onesignal-slidedown-dialog">${dialogHtml}</div>`);

      // Animate it in depending on environment
      addCssClass(this.container, bowser.mobile ? 'slide-up' : 'slide-down');

      // Add click event handlers
      this.allowButton.addEventListener('click', this.onSlidedownAllowed.bind(this));
      this.cancelButton.addEventListener('click', this.onSlidedownCanceled.bind(this));
      Event.trigger(Slidedown.EVENTS.SHOWN);
    }
  }

  async onSlidedownAllowed(_: any) {
    await Event.trigger(Slidedown.EVENTS.ALLOW_CLICK);
  }

  onSlidedownCanceled(_: any) {
    Event.trigger(Slidedown.EVENTS.CANCEL_CLICK);
    this.close();
  }

  close() {
    addCssClass(this.container, 'close-slidedown');
    once(this.dialog, 'animationend', (event, destroyListenerFn) => {
      if (event.target === this.dialog &&
          (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
          // Uninstall the event listener for animationend
          removeDomElement('#onesignal-slidedown-container');
          destroyListenerFn();
          Event.trigger(Slidedown.EVENTS.CLOSED);
      }
    }, true);
  }

  /**
   * only used with Category Slidedown
   */
  toggleSaveState() {
    if (!this.isInSaveState) {
      // note: savingButtonText is hardcoded in constructor. TODO: pull from config & set defaults for future release
      this.allowButton.innerHTML = this.getIndicatorHolderHtmlWithText(this.options.savingButtonText!);
      addDomElement(this.buttonIndicatorHolder, 'beforeend', getLoadingIndicatorWithColor("#FFFFFF"));
      (<HTMLButtonElement>this.allowButton).disabled = true;
      addCssClass(this.allowButton, 'disabled');
      addCssClass(this.allowButton, 'onesignal-saving-state-button');
    } else {
      // positiveUpdateButton should be defined as written in MainHelper.getSlidedownPermissionMessageOptions
      this.allowButton.innerHTML = this.options.positiveUpdateButton!;
      removeDomElement('#onesignal-button-indicator-holder');
      (<HTMLButtonElement>this.allowButton).disabled = false;
      removeCssClass(this.allowButton, 'disabled');
      removeCssClass(this.allowButton, 'onesignal-saving-state-button');
    }
    this.isInSaveState = !this.isInSaveState;
  }

  toggleFailureState() {
    if (!this.isShowingFailureState) {
      // note: errorButtonText is hardcoded in constructor. TODO: pull from config & set defaults for future release
      this.allowButton.innerHTML = this.getIndicatorHolderHtmlWithText(this.options.errorButtonText!);
      addDomElement(this.buttonIndicatorHolder, 'beforeend', getRetryIndicator());
      addCssClass(this.allowButton, 'onesignal-error-state-button');
    } else {
      removeDomElement('#onesignal-button-indicator-holder');
      removeCssClass(this.allowButton, 'onesignal-error-state-button');
    }
    this.isShowingFailureState = !this.isShowingFailureState;
  }

  getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this.notificationIcons);
  }

  getIndicatorHolderHtmlWithText(text: string) {
    return `${text}<div id="onesignal-button-indicator-holder" class="onesignal-button-indicator-holder"></div>`;
  }

  get container() {
    return getDomElementOrStub('#onesignal-slidedown-container');
  }

  get dialog() {
    return getDomElementOrStub('#onesignal-slidedown-dialog');
  }

  get allowButton() {
    return getDomElementOrStub('#onesignal-slidedown-allow-button');
  }

  get cancelButton() {
    return getDomElementOrStub('#onesignal-slidedown-cancel-button');
  }

  get buttonIndicatorHolder() {
    return getDomElementOrStub('#onesignal-button-indicator-holder');
  }

  get slidedownFooter() {
    return getDomElementOrStub('#slidedown-footer');
  }
}

export function manageNotifyButtonStateWhileSlidedownShows() {
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
