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

export default class Slidedown {
  public options: SlidedownPermissionMessageOptions;
  public notificationIcons: NotificationIcons | null;
  private isInSaveState: boolean;
  public isShowingFailureMessage: boolean;

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
    this.options.actionMessage = options.actionMessage.substring(0, 90);
    this.options.acceptButtonText = options.acceptButtonText.substring(0, 16);
    this.options.cancelButtonText = options.cancelButtonText.substring(0, 16);
    this.options.positiveUpdateButtonText = options.positiveUpdateButtonText ?
      options.positiveUpdateButtonText.substring(0, 16):
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.positiveUpdateButton;
    this.options.negativeUpdateButtonText = options.negativeUpdateButtonText?
      options.negativeUpdateButtonText.substring(0, 16):
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.negativeUpdateButton;

    this.notificationIcons = null;
    this.isInSaveState = false;
    this.isShowingFailureMessage = false;
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
        this.options.positiveUpdateButtonText : this.options.acceptButtonText;
      const negativeButtonText = isInUpdateMode ?
        this.options.negativeUpdateButtonText : this.options.cancelButtonText;

      const icon = this.getPlatformNotificationIcon();
      const dialogHtml = getDialogHTML({
        icon,
        actionMessage: this.options.actionMessage,
        positiveButtonText,
        negativeButtonText
      });

      // Insert the container
      addDomElement('body', 'beforeend',
          '<div id="onesignal-slidedown-container" class="onesignal-slidedown-container onesignal-reset"></div>');
      // Insert the dialog
      addDomElement(this.container, 'beforeend',
          `<div id="onesignal-slidedown-dialog" class="onesignal-slidedown-dialog">${dialogHtml}</div>`);

      // Add dynamic button width by class
      // Need this due to saving state (with loading indicator) which may be different size as text
      // 8em is the minimum to avoid wrapping indicator
      if (positiveButtonText!.length > 14) {
        addCssClass(this.allowButton, 'twelve-width-btn');
      } else if (positiveButtonText!.length > 10) {
        addCssClass(this.allowButton, 'ten-width-btn');
      } else {
        addCssClass(this.allowButton, 'eight-width-btn');
      }

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
      this.allowButton.innerHTML = `Saving...<div id="saving-loading-indicator-holder" class="saving-loading-indicator-holder"></div>`;
      addDomElement(this.savingLoadingIndicatorHolder, 'beforeend', getLoadingIndicatorWithColor("#FFFFFF"));
      (<HTMLButtonElement>this.allowButton).disabled = true;
      addCssClass(this.allowButton, 'disabled');
      addCssClass(this.allowButton, 'onesignal-saving-state-button');
    } else {
      // positiveUpdateButtonText should be defined as written in MainHelper.getSlidedownPermissionMessageOptions
      this.allowButton.innerHTML = this.options.positiveUpdateButtonText!;
      removeDomElement('#saving-loading-indicator-holder');
      (<HTMLButtonElement>this.allowButton).disabled = false;
      removeCssClass(this.allowButton, 'disabled');
      removeCssClass(this.allowButton, 'onesignal-saving-state-button');
    }
    this.isInSaveState = !this.isInSaveState;
  }

  toggleFailureMessage() {
    if (!this.isShowingFailureMessage) {
      const { failureMessage } = SERVER_CONFIG_DEFAULTS_SLIDEDOWN;
      addDomElement(this.slidedownFooter, 'afterbegin', `<div id="failure-message" class="onesignal-tag-failure-message">${failureMessage}</div>`);
    } else {
      removeDomElement('#failure-message');
    }
    this.isShowingFailureMessage = !this.isShowingFailureMessage;
  }

  getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this.notificationIcons);
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

  get savingLoadingIndicatorHolder() {
    return getDomElementOrStub('#saving-loading-indicator-holder');
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
