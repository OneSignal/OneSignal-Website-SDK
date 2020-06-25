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

export default class Slidedown {
  public options: SlidedownPermissionMessageOptions;
  public notificationIcons: NotificationIcons | null;
  private isInSaveState: boolean;
  public isShowingFailureMessage: boolean;

  // identifiers and style classes
  public static readonly onesignalSlidedownContainerClass = "onesignal-slidedown-container";
  public static readonly onesignalResetClass = "onesignal-reset";
  public static readonly onesignalSlidedownDialogClass = "onesignal-slidedown-dialog";
  public static readonly onesignalSavingLoadingIndicatorHolderClass = "onesignal-saving-loading-indicator-holder";
  public static readonly onesignalSlidedownAllowButtonClass = "onesignal-slidedown-allow-button";
  public static readonly onesignalSlidedownCancelButtonClass = "onesignal-slidedown-cancel-button";
  public static readonly slidedownBody = "slidedown-body";
  public static readonly slidedownFooter = "slidedown-footer";

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
      sanitizeHtml(options.positiveUpdateButton.substring(0, 16)):
      SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.positiveUpdateButton;
    this.options.negativeUpdateButton = options.negativeUpdateButton ?
      sanitizeHtml(options.negativeUpdateButton.substring(0, 16)) :
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
      if (this.container.className.includes(Slidedown.onesignalSlidedownContainerClass)) {
          removeDomElement(`#${Slidedown.onesignalSlidedownContainerClass}`);
      }
      const positiveButtonText = isInUpdateMode ?
        this.options.positiveUpdateButton : this.options.acceptButtonText;
      const negativeButtonText = isInUpdateMode ?
        this.options.negativeUpdateButton : this.options.cancelButtonText;

      const icon = this.getPlatformNotificationIcon();
      const dialogHtml = getDialogHTML({
        icon,
        actionMessage: this.options.actionMessage,
        positiveButtonText,
        negativeButtonText
      });

      // Insert the container
      addDomElement('body', 'beforeend',
          `<div id="${Slidedown.onesignalSlidedownContainerClass}" class="${Slidedown.onesignalSlidedownContainerClass} ${Slidedown.onesignalResetClass}"></div>`);
      // Insert the dialog
      addDomElement(this.container, 'beforeend',
          `<div id="${Slidedown.onesignalSlidedownDialogClass}" class="${Slidedown.onesignalSlidedownDialogClass}">${dialogHtml}</div>`);

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
          removeDomElement(`#${Slidedown.onesignalSlidedownContainerClass}`);
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
      this.allowButton.innerHTML = `Saving...<div id="${Slidedown.onesignalSavingLoadingIndicatorHolderClass}" class="${Slidedown.onesignalSavingLoadingIndicatorHolderClass}"></div>`;
      addDomElement(this.savingLoadingIndicatorHolder, 'beforeend', getLoadingIndicatorWithColor("#FFFFFF"));
      (<HTMLButtonElement>this.allowButton).disabled = true;
      addCssClass(this.allowButton, 'disabled');
      addCssClass(this.allowButton, 'onesignal-saving-state-button');
    } else {
      // positiveUpdateButton should be defined as written in MainHelper.getSlidedownPermissionMessageOptions
      this.allowButton.innerHTML = this.options.positiveUpdateButton!;
      removeDomElement(`#${Slidedown.onesignalSavingLoadingIndicatorHolderClass}`);
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
    return getDomElementOrStub(`#${Slidedown.onesignalSlidedownContainerClass}`);
  }

  get dialog() {
    return getDomElementOrStub(`#${Slidedown.onesignalSlidedownDialogClass}`);
  }

  get allowButton() {
    return getDomElementOrStub(`#${Slidedown.onesignalSlidedownAllowButtonClass}`);
  }

  get cancelButton() {
    return getDomElementOrStub(`#${Slidedown.onesignalSlidedownCancelButtonClass}`);
  }

  get savingLoadingIndicatorHolder() {
    return getDomElementOrStub(`#${Slidedown.onesignalSavingLoadingIndicatorHolderClass}`);
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
