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
import { SlidedownPermissionMessageOptions } from '../models/Prompts';
import { SERVER_CONFIG_DEFAULTS_SLIDEDOWN } from '../config';
import { getLoadingIndicatorWithColor } from './LoadingIndicator';
import { getRetryIndicator } from './RetryIndicator';
import { SLIDEDOWN_CSS_CLASSES, SLIDEDOWN_CSS_IDS, COLORS } from "./constants";
import { Categories } from '../../src/models/Tags';
import Log from '../../src/libraries/Log';
import { getSlidedownElement } from './SlidedownElement';

export default class Slidedown {
  public options: SlidedownPermissionMessageOptions;
  public notificationIcons: NotificationIcons | null;
  public isShowingFailureState: boolean;

  private categoryOptions: Categories|undefined;

  static get EVENTS() {
    return {
      ALLOW_CLICK: 'popoverAllowClick',
      CANCEL_CLICK: 'popoverCancelClick',
      SHOWN: 'popoverShown',
      CLOSED: 'popoverClosed',
    };
  }

  constructor(options?: SlidedownPermissionMessageOptions) {
    if (!options) {
        options = MainHelper.getSlidedownPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);
    }
    this.options = options;
    this.categoryOptions = options.categories;
    this.options.actionMessage = options.actionMessage.substring(0, 90);
    this.options.acceptButtonText = options.acceptButtonText.substring(0, 16);
    this.options.cancelButtonText = options.cancelButtonText.substring(0, 16);
    this.notificationIcons = null;
    this.isShowingFailureState = false;

    if (!!this.categoryOptions) {
      this.categoryOptions.positiveUpdateButton = this.categoryOptions.positiveUpdateButton.substring(0, 16),
      this.categoryOptions.negativeUpdateButton = this.categoryOptions.negativeUpdateButton.substring(0, 16),
      this.categoryOptions.updateMessage = this.categoryOptions.updateMessage.substring(0, 90),

        // NOTE: will be configurable in the future
      this.categoryOptions.savingButtonText = SERVER_CONFIG_DEFAULTS_SLIDEDOWN.savingText;
      this.categoryOptions.errorButtonText = this.categoryOptions.positiveUpdateButton;
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
      const positiveButtonText = isInUpdateMode && !!this.categoryOptions ?
        this.categoryOptions.positiveUpdateButton : this.options.acceptButtonText;
      const negativeButtonText = isInUpdateMode && !!this.categoryOptions ?
        this.categoryOptions.negativeUpdateButton : this.options.cancelButtonText;
      const messageText = isInUpdateMode && !!this.categoryOptions ?
        this.categoryOptions.updateMessage : this.options.actionMessage;

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
      Event.trigger(Slidedown.EVENTS.SHOWN);
    }
  }

  async onSlidedownAllowed(_: any): Promise<void> {
    await Event.trigger(Slidedown.EVENTS.ALLOW_CLICK);
  }

  onSlidedownCanceled(_: any): void {
    Event.trigger(Slidedown.EVENTS.CANCEL_CLICK);
    this.close();
  }

  close(): void {
    addCssClass(this.container, SLIDEDOWN_CSS_CLASSES.closeSlidedown);
    once(this.dialog, 'animationend', (event: any, destroyListenerFn: () => void) => {
      if (event.target === this.dialog &&
          (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
          // Uninstall the event listener for animationend
          removeDomElement(`#${SLIDEDOWN_CSS_IDS.container}`);
          destroyListenerFn();
          Event.trigger(Slidedown.EVENTS.CLOSED);
      }
    }, true);
  }

  /**
   * only used with Category Slidedown
   */
  setSaveState(state: boolean): void {
    if (!this.categoryOptions) {
      Log.debug("Slidedown private category options are not defined");
      return;
    }

    if (state) {
      // note: savingButtonText is hardcoded in constructor. TODO: pull from config & set defaults for future release
      this.allowButton.disabled = true;
      this.allowButton.textContent = null;

      this.allowButton.insertAdjacentElement('beforeend', this.getTextSpan(this.categoryOptions.savingButtonText));
      this.allowButton.insertAdjacentElement('beforeend', this.getIndicatorHolder());

      addDomElement(this.buttonIndicatorHolder,'beforeend', getLoadingIndicatorWithColor(COLORS.whiteLoadingIndicator));
      addCssClass(this.allowButton, 'disabled');
      addCssClass(this.allowButton, SLIDEDOWN_CSS_CLASSES.savingStateButton);
    } else {
      // positiveUpdateButton should be defined as written in MainHelper.getSlidedownPermissionMessageOptions
      this.allowButton.textContent = this.categoryOptions.positiveUpdateButton;
      removeDomElement(`#${SLIDEDOWN_CSS_CLASSES.buttonIndicatorHolder}`);
      this.allowButton.disabled = false;
      removeCssClass(this.allowButton, 'disabled');
      removeCssClass(this.allowButton, SLIDEDOWN_CSS_CLASSES.savingStateButton);
    }
  }

  setFailureState(state: boolean): void {
    if (!this.categoryOptions) {
      Log.debug("Slidedown private category options are not defined");
      return;
    }

    if (state) {
      // note: errorButtonText is hardcoded in constructor. TODO: pull from config & set defaults for future release
      this.allowButton.textContent = null;
      this.allowButton.insertAdjacentElement('beforeend', this.getTextSpan(this.categoryOptions.errorButtonText));
      this.allowButton.insertAdjacentElement('beforeend', this.getIndicatorHolder());

      addDomElement(this.buttonIndicatorHolder, 'beforeend', getRetryIndicator());
      addCssClass(this.allowButton, 'onesignal-error-state-button');
    } else {
      removeDomElement('#onesignal-button-indicator-holder');
      removeCssClass(this.allowButton, 'onesignal-error-state-button');
    }

    this.isShowingFailureState = state;
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
