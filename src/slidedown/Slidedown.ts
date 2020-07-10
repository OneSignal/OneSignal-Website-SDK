import bowser from 'bowser';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import { addCssClass, addDomElement, getPlatformNotificationIcon, once, removeDomElement } from '../utils';
import { SlidedownPermissionMessageOptions } from '../models/Prompts';
import { SERVER_CONFIG_DEFAULTS_SLIDEDOWN } from '../config';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';
import { getSlidedownHtml } from './SlidedownHtml';
import { getRetryIndicator } from './RetryIndicator';
import { SlidedownCssClasses, SlidedownCssIds, COLORS } from "./constants";

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

    this.notificationIcons = null;
  }

  async create() {
    if (this.notificationIcons === null) {
      const icons = await MainHelper.getNotificationIcons();

      this.notificationIcons = icons;

      // Remove any existing container
      if (this.container) {
        removeDomElement('#onesignal-popover-container');
      }

      const icon = this.getPlatformNotificationIcon();
      const slidedownHtml = getSlidedownHtml({
        messageText,
        icon,
        positiveButtonText,
        negativeButtonText
      });

      // Insert the container
      addDomElement('body', 'beforeend',
          '<div id="onesignal-popover-container" class="onesignal-popover-container onesignal-reset"></div>');
      // Insert the dialog
      addDomElement(this.container, 'beforeend',
          `<div id="${SlidedownCssIds.dialog}" class="${SlidedownCssClasses.dialog}">${slidedownHtml}</div>`);

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
    once(this.dialog, 'animationend', (event: any, destroyListenerFn: () => void) => {
      if (event.target === this.dialog &&
          (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
          // Uninstall the event listener for animationend
          removeDomElement('#onesignal-popover-container');
          destroyListenerFn();
          Event.trigger(Slidedown.EVENTS.CLOSED);
      }
    }, true);
  }

  getPlatformNotificationIcon(): string {
    return getPlatformNotificationIcon(this.notificationIcons);
  }

  get container() {
    return document.querySelector('#onesignal-popover-container');
  }

  get dialog() {
    return document.querySelector('#onesignal-popover-dialog');
  }

  get allowButton() {
    return document.querySelector('#onesignal-popover-allow-button');
  }

  get cancelButton() {
    return document.querySelector('#onesignal-popover-cancel-button');
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
