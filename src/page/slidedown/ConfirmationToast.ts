import {
  addCssClass,
  getDomElementOrStub,
  removeDomElement,
} from 'src/shared/helpers/dom';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import {
  SLIDEDOWN_CSS_CLASSES,
  SLIDEDOWN_CSS_IDS,
  TOAST_CLASSES,
  TOAST_IDS,
} from 'src/shared/slidedown/constants';
import { isMobileBrowser } from 'src/shared/useragent/detect';
import { once } from 'src/shared/utils/utils';

export default class ConfirmationToast {
  private _message: string;

  constructor(message: string) {
    this._message = message;
  }

  async _show(): Promise<void> {
    const toastElement = document.createElement('div');
    const toastText = document.createElement('p');

    toastText.innerText = this._message;
    toastElement.appendChild(toastText);

    const slidedownContainer = document.createElement('div');
    const dialogContainer = document.createElement('div');

    // Insert the container
    slidedownContainer.id = SLIDEDOWN_CSS_IDS._Container;
    toastElement.id = TOAST_IDS._ToastText;
    addCssClass(toastElement, TOAST_CLASSES._ToastText);
    addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES._Container);
    addCssClass(slidedownContainer, SLIDEDOWN_CSS_CLASSES._Reset);
    getDomElementOrStub('body').appendChild(slidedownContainer);

    // Insert the dialog
    dialogContainer.id = SLIDEDOWN_CSS_IDS._Dialog;
    addCssClass(dialogContainer, SLIDEDOWN_CSS_CLASSES._Dialog);
    dialogContainer.appendChild(toastElement);
    this._container.appendChild(dialogContainer);

    // Animate it in depending on environment
    addCssClass(
      this._container,
      isMobileBrowser()
        ? SLIDEDOWN_CSS_CLASSES._SlideUp
        : SLIDEDOWN_CSS_CLASSES._SlideDown,
    );

    ConfirmationToast._triggerSlidedownEvent('toastShown');
  }

  static async _triggerSlidedownEvent(
    eventName: 'toastShown' | 'toastClosed',
  ): Promise<void> {
    await OneSignalEvent._trigger(eventName);
  }

  _close(): void {
    addCssClass(this._container, SLIDEDOWN_CSS_CLASSES._CloseSlidedown);
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
          removeDomElement(`#${SLIDEDOWN_CSS_IDS._Container}`);
          destroyListenerFn();
        }
      },
      true,
    );
  }

  get _container() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS._Container}`);
  }

  get _dialog() {
    return getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS._Dialog}`);
  }
}
