import { registerForPushNotifications } from 'src/shared/helpers/init';
import { limitGetLast } from 'src/shared/services/limitStore';
import type Bell from './Bell';
import { MESSAGE_TIMEOUT, MessageType } from './constants';

export default class Button {
  public _isHandlingClick = false;
  public _bell: Bell;
  public _selector = '.onesignal-bell-launcher-button';

  constructor(bell: Bell) {
    this._bell = bell;

    const element = this._element;
    if (element) {
      element.addEventListener('touchstart', () => this._onTap(), {
        passive: true,
      });
      element.addEventListener('mousedown', () => this._onTap());
      element.addEventListener('mouseup', () => this._onEndTap());
      element.addEventListener('click', () => this._onClick());
    }
  }

  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  _onTap() {
    const el = this._element;
    if (el) {
      el.classList.remove('pulsing');
      void el.offsetWidth;
      el.classList.add('pulsing');
      el.classList.add('onesignal-bell-launcher-button-active');
    }
    this._bell._badge._element?.classList.add('onesignal-bell-launcher-badge-active');
  }

  _onEndTap() {
    this._element?.classList.remove('onesignal-bell-launcher-button-active');
    this._bell._badge._element?.classList.remove('onesignal-bell-launcher-badge-active');
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
        if (!this._bell._launcher._active) {
          await this._bell._launcher._activate();
        }
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
      this._bell._launcher._element?.classList.remove('onesignal-bell-no-tip');
      await this._bell._launcher._inactivate();
    } else {
      await this._bell._showDialogProcedure();
    }
  }

}
