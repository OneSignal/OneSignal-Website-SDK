import bowser from 'bowser';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import { addCssClass, addDomElement, getPlatformNotificationIcon, once, removeDomElement } from '../utils';
import { SlidedownPermissionMessageOptions } from '../models/Prompts';
import TaggingContainer from './TaggingContainer';
import { SERVER_CONFIG_DEFAULTS_UPDATE_BUTTONS } from '../config';

export default class Slidedown {
  public options: SlidedownPermissionMessageOptions;
  public notificationIcons: NotificationIcons | null;

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
    this.options.acceptButtonText = options.acceptButtonText.substring(0, 15);
    this.options.cancelButtonText = options.cancelButtonText.substring(0, 15);
    this.options.positiveUpdateButtonText = options.positiveUpdateButtonText ?
      options.positiveUpdateButtonText.substring(0, 15): SERVER_CONFIG_DEFAULTS_UPDATE_BUTTONS.positiveButton;
    this.options.negativeUpdateButtonText = options.negativeUpdateButtonText?
      options.negativeUpdateButtonText.substring(0, 15): SERVER_CONFIG_DEFAULTS_UPDATE_BUTTONS.negativeButton;

    this.notificationIcons = null;
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

      const icon = this.getPlatformNotificationIcon();
      let defaultIcon = `data:image/svg+xml,%3Csvg fill='none' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cg clip-path='url(%23clip0)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M33.232 28.434a2.5 2.5 0 001.768.733 1.667 1.667 0 010 3.333H5a1.667 1.667 0 110-3.333 2.5 2.5 0 002.5-2.5v-8.104A13.262 13.262 0 0118.333 5.122V1.667a1.666 1.666 0 113.334 0v3.455A13.262 13.262 0 0132.5 18.563v8.104a2.5 2.5 0 00.732 1.767zM16.273 35h7.454a.413.413 0 01.413.37 4.167 4.167 0 11-8.28 0 .417.417 0 01.413-.37z' fill='%23BDC4CB'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0'%3E%3Cpath fill='%23fff' d='M0 0h40v40H0z'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E`;
      let dialogHtml = `<div id="normal-slidedown"><div class="slidedown-body" id="slidedown-body"><div class="slidedown-body-icon"><img alt="notification icon" class="${icon === 'default-icon' ? 'default-icon' : ''}" src="${icon === 'default-icon' ? defaultIcon : icon}"></div><div class="slidedown-body-message">${this.options['actionMessage']}</div><div class="clearfix"></div><div id="onesignal-loading-container"></div></div><div class="slidedown-footer"><button id="onesignal-slidedown-allow-button" class="align-right primary slidedown-button">${isInUpdateMode ? this.options['positiveUpdateButtonText'] : this.options['acceptButtonText']}</button><button id="onesignal-slidedown-cancel-button" class="align-right secondary slidedown-button">${isInUpdateMode ? this.options['negativeUpdateButtonText'] : this.options['cancelButtonText']}</button><div class="clearfix"></div></div></div>`;

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
