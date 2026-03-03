import { addDomElement, removeDomElement } from 'src/shared/helpers/dom';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import {
  limitGetLast,
  limitIsEmpty,
  limitStorePut,
} from 'src/shared/services/limitStore';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';
import { MESSAGE_TIMEOUT, MessageType } from './constants';

const MOUSE_EVENT_KEY = 'bell.launcher.button.mouse';

export default class Button extends AnimatedElement {
  public _isHandlingClick = false;
  public _bell: Bell;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-button',
      undefined,
      'onesignal-bell-launcher-button-active',
    );

    this._bell = bell;

    const element = this._element;
    if (element) {
      element.addEventListener(
        'touchstart',
        () => {
          this._onHovering();
          this._onTap();
        },
        { passive: true },
      );

      element.addEventListener('mouseenter', () => this._onHovering());
      element.addEventListener('mouseleave', () => this._onHovered());
      element.addEventListener('touchmove', () => this._onHovered(), {
        passive: true,
      });
      element.addEventListener('mousedown', () => this._onTap());
      element.addEventListener('mouseup', () => this._onEndTap());
      element.addEventListener('click', () => {
        this._onHovered();
        this._onClick();
      });
    }
  }

  _onHovering() {
    if (
      limitIsEmpty(MOUSE_EVENT_KEY) ||
      limitGetLast(MOUSE_EVENT_KEY) === 'out'
    ) {
      this._bell._onHovering();
    }
    limitStorePut(MOUSE_EVENT_KEY, 'over');
  }

  _onHovered() {
    limitStorePut(MOUSE_EVENT_KEY, 'out');
    this._bell._onHovered();
  }

  _onTap() {
    this._pulse();
    this._activate();
    this._bell._badge._activate();
  }

  _onEndTap() {
    this._inactivate();
    this._bell._badge._inactivate();
  }

  async _onClick() {
    if (this._isHandlingClick) return;
    this._isHandlingClick = true;

    try {
      if (
        this._bell._message._shown &&
        this._bell._message._contentType == MessageType._Message
      ) {
        return;
      }

      const optedOut = limitGetLast<boolean>('subscription.optedOut');
      if (this._bell._unsubscribed && !optedOut) {
        registerForPushNotifications();
        this._bell._ignoreSubscriptionState = true;
        OneSignal._emitter.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async () => {
          await this._bell._message._display(
            MessageType._Message,
            this._bell._options.text['message.action.subscribed'],
            MESSAGE_TIMEOUT,
          );
          this._bell._ignoreSubscriptionState = false;
          this._bell._launcher._inactivate();
        });
      }

      if (
        this._bell._unsubscribed ||
        this._bell._subscribed ||
        this._bell._blocked
      ) {
        await this._bell._launcher._activateIfInactive();
        await this._toggleDialog();
      }

      await this._bell._message._hide();
    } finally {
      this._isHandlingClick = false;
    }
  }

  async _toggleDialog() {
    if (this._bell._dialog._shown) {
      await this._bell._dialog._hide();
      await this._bell._launcher._inactivateIfWasInactive();
    } else {
      await this._bell._showDialogProcedure();
    }
  }

  _pulse() {
    removeDomElement('.pulse-ring');
    if (this._element) {
      addDomElement(
        this._element,
        'beforeend',
        '<div class="pulse-ring"></div>',
      );
    }
    this._bell._setCustomColorsIfSpecified();
  }
}
