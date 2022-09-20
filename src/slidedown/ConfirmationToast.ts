import bowser from 'bowser';
import Event from '../Event';
import {
  addCssClass,
  once,
  removeDomElement,
  getDomElementOrStub
} from '../utils';
import { SLIDEDOWN_CSS_CLASSES, SLIDEDOWN_CSS_IDS, TOAST_CLASSES, TOAST_IDS } from "./constants";

export default class ConfirmationToast {
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  async show(): Promise<void> {
    const toastElement = document.createElement("div");
    const toastText    = document.createElement("p");

    toastText.innerText = this.message;
    toastElement.appendChild(toastText);

    const slidedownContainer = document.createElement("div");
    const dialogContainer    = document.createElement("div");

    // Insert the container
    slidedownContainer.id = SLIDEDOWN_CSS_IDS.container;
    toastElement.id = TOAST_IDS.toastText;
    addCssClass(toastElement, TOAST_CLASSES.toastText);
    addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES.container);
    addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES.reset);
    getDomElementOrStub('body').appendChild(slidedownContainer);

    // Insert the dialog
    dialogContainer.id = SLIDEDOWN_CSS_IDS.dialog;
    addCssClass(dialogContainer, SLIDEDOWN_CSS_CLASSES.dialog);
    dialogContainer.appendChild(toastElement);
    this.container.appendChild(dialogContainer);

    // Animate it in depending on environment
    addCssClass(this.container, bowser.mobile ? SLIDEDOWN_CSS_CLASSES.slideUp : SLIDEDOWN_CSS_CLASSES.slideDown);

    ConfirmationToast.triggerSlidedownEvent(ConfirmationToast.EVENTS.SHOWN);
  }

  static async triggerSlidedownEvent(eventName: string): Promise<void> {
    await Event.trigger(eventName);
  }

  close(): void {
    addCssClass(this.container, SLIDEDOWN_CSS_CLASSES.closeSlidedown);
    once(this.dialog, 'animationend', (event: any, destroyListenerFn: () => void) => {
      if (event.target === this.dialog &&
          (event.animationName === 'slideDownExit' || event.animationName === 'slideUpExit')) {
            // Uninstall the event listener for animationend
            removeDomElement(`#${SLIDEDOWN_CSS_IDS.container}`);
            destroyListenerFn();
      }
    }, true);
  }

  get container() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.container}`);
  }

  get dialog() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.dialog}`);
  }

  static get EVENTS() {
    return {
      SHOWN: 'toastShown',
      CLOSED: 'toastClosed',
    };
  }
}
