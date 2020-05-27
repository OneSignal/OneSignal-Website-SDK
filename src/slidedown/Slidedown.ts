import bowser from 'bowser';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import { addCssClass, addDomElement, getPlatformNotificationIcon, once, removeDomElement, removeCssClass } from '../utils';
import { SlidedownPermissionMessageOptions } from '../models/Prompts';
import TaggingContainer from './TaggingContainer';
import { SERVER_CONFIG_DEFAULTS_SLIDEDOWN } from '../config';
import getLoadingIndicatorWithColor from './LoadingIndicator';

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
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.positiveButton;
    this.options.negativeUpdateButtonText = options.negativeUpdateButtonText?
      options.negativeUpdateButtonText.substring(0, 16):
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.negativeButton;

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
      if (this.container) {
          removeDomElement('#onesignal-slidedown-container');
      }
      const positiveButtonText = isInUpdateMode ?
        this.options['positiveUpdateButtonText'] : this.options['acceptButtonText'];
      const negativeButtonText = isInUpdateMode ?
        this.options['negativeUpdateButtonText'] : this.options['cancelButtonText'];

      const icon = this.getPlatformNotificationIcon();
      let defaultIcon = `data:image/svg+xml,%3Csvg fill='none' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg clip-path='url(%23clip0)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M33.232 28.434a2.5 2.5 0 001.768.733 1.667 1.667 0 010 3.333H5a1.667 1.667 0 110-3.333 2.5 2.5 0 002.5-2.5v-8.104A13.262 13.262 0 0118.333 5.122V1.667a1.666 1.666 0 113.334 0v3.455A13.262 13.262 0 0132.5 18.563v8.104a2.5 2.5 0 00.732 1.767zM16.273 35h7.454a.413.413 0 01.413.37 4.167 4.167 0 11-8.28 0 .417.417 0 01.413-.37z' fill='%23BDC4CB'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0'%3E%3Cpath fill='%23fff' d='M0 0h40v40H0z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E`;
      let dialogHtml = `<div id="normal-slidedown"><div class="slidedown-body" id="slidedown-body"><div class="slidedown-body-icon"><img alt="notification icon" class="${icon === 'default-icon' ? 'default-icon' : ''}" src="${icon === 'default-icon' ? defaultIcon : icon}"></div><div class="slidedown-body-message">${this.options['actionMessage']}</div><div class="clearfix"></div><div id="onesignal-loading-container"></div></div><div class="slidedown-footer" id="slidedown-footer"><button id="onesignal-slidedown-allow-button" class="align-right primary slidedown-button">${positiveButtonText}</button><button id="onesignal-slidedown-cancel-button" class="align-right secondary slidedown-button">${negativeButtonText}</button><div class="clearfix"></div></div></div>`;

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

  toggleSaveState() {
    if (!this.isInSaveState) {
      this.allowButton.innerHTML = `Saving...<div id="saving-loading-indicator-holder" style="display: flex"></div>`;
      addDomElement(this.savingLoadingIndicatorHolder, 'beforeend', getLoadingIndicatorWithColor("#FFFFFF"));
      (<HTMLButtonElement>this.allowButton).disabled = true;
      addCssClass(this.allowButton, 'disabled');
      addCssClass(this.allowButton, 'onesignal-saving-state-button');
    } else {
      this.allowButton.innerHTML = this.options['positiveUpdateButtonText'];
      removeDomElement('#saving-loading-indicator-holder');
      (<HTMLButtonElement>this.allowButton).disabled = false;
      removeCssClass(this.allowButton, 'disabled');
      removeCssClass(this.allowButton, 'onesignal-saving-state-button');
    }
    this.isInSaveState = !this.isInSaveState;
  }

  toggleFailureMessage() {
    if (!this.isShowingFailureMessage) {
      addDomElement(this.slidedownFooter, 'afterbegin', `<div id="failure-message" style="display: flex; float:left; color:red;">Updating failed</div>`);
    } else {
      removeDomElement('#failure-message');
    }
    this.isShowingFailureMessage = !this.isShowingFailureMessage;
  }

  getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this.notificationIcons);
  }

  get container() {
    return document.querySelector('#onesignal-slidedown-container');
  }

  get dialog() {
    return document.querySelector('#onesignal-slidedown-dialog');
  }

  get allowButton() {
    return document.querySelector('#onesignal-slidedown-allow-button');
  }

  get cancelButton() {
    return document.querySelector('#onesignal-slidedown-cancel-button');
  }

  get savingLoadingIndicatorHolder() {
    return document.querySelector('#saving-loading-indicator-holder');
  }

  get slidedownFooter() {
    return document.querySelector('#slidedown-footer');
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
