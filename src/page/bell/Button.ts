import { registerForPushNotifications } from 'src/shared/helpers/init';
import { limitGetLast } from 'src/shared/services/limitStore';
import type Bell from './Bell';
import { MESSAGE_TIMEOUT, MessageType } from './constants';

export default class Button {
  public _bell: Bell;
  public _selector = '.onesignal-bell-launcher-button';

  constructor(bell: Bell) {
    this._bell = bell;
    this._element?.addEventListener('click', () => this._onClick());
  }

  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  _onClick() {
    const el = this._element;
    if (el) {
      el.classList.remove('pulsing');
      void el.offsetWidth;
      el.classList.add('pulsing');
    }

    const optedOut = limitGetLast<boolean>('subscription.optedOut');
    if (this._bell._unsubscribed && !optedOut) {
      registerForPushNotifications();
      this._bell._ignoreSubscriptionState = true;
      OneSignal._emitter.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async () => {
        this._bell._actionInProgress = true;
        await this._bell._message._display(
          MessageType._Message,
          this._bell._options.text['message.action.subscribed'],
          MESSAGE_TIMEOUT,
        );
        this._bell._ignoreSubscriptionState = false;
        this._bell._actionInProgress = false;
      });
    }
  }
}
