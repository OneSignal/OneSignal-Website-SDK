import { addDomElement, removeDomElement } from 'src/shared/helpers/dom';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import LimitStore from 'src/shared/services/LimitStore';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';
import { MESSAGE_TIMEOUT, MessageType } from './constants';

export default class Button extends AnimatedElement {
  public _events: Record<string, string>;
  public _bell: Bell;
  private _isHandlingClick = false;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-button',
      undefined,
      'onesignal-bell-launcher-button-active',
      undefined,
    );

    this._bell = bell;
    this._events = {
      mouse: 'bell.launcher.button.mouse',
    };

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

      element.addEventListener('mouseenter', () => {
        this._onHovering();
      });

      element.addEventListener('mouseleave', () => {
        this._onHovered();
      });
      element.addEventListener(
        'touchmove',
        () => {
          this._onHovered();
        },
        { passive: true },
      );

      element.addEventListener('mousedown', () => {
        this._onTap();
      });

      element.addEventListener('mouseup', () => {
        this._onEndTap();
      });

      element.addEventListener('click', () => {
        this._onClick();
      });
    }
  }

  _onHovering() {
    if (
      LimitStore.isEmpty(this._events.mouse) ||
      LimitStore.getLast(this._events.mouse) === 'out'
    ) {
      OneSignalEvent.trigger('notifyButtonHovering');
    }
    LimitStore.put(this._events.mouse, 'over');
  }

  _onHovered() {
    LimitStore.put(this._events.mouse, 'out');
    OneSignalEvent.trigger('notifyButtonHover');
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
    // Prevent concurrent clicks (fixes GitHub issue #409)
    if (this._isHandlingClick) {
      return;
    }
    this._isHandlingClick = true;

    try {
      OneSignalEvent.trigger('notifyButtonButtonClick');
      OneSignalEvent.trigger('notifyButtonLauncherClick');

      if (
        this._bell._message._shown &&
        this._bell._message._contentType == MessageType._Message
      ) {
        // A message is being shown, it'll disappear soon
        return;
      }

      const optedOut = LimitStore.getLast<boolean>('subscription.optedOut');

      // Handle resubscription case
      if (this._bell._unsubscribed && !optedOut) {
        registerForPushNotifications();
        this._bell._ignoreSubscriptionState = true;
        OneSignal.emitter.once('change', async () => {
          try {
            await this._bell._message._display(
              MessageType._Message,
              this._bell._options.text['message.action.subscribed'],
              MESSAGE_TIMEOUT,
            );
            this._bell._ignoreSubscriptionState = false;
            await this._bell._launcher._inactivate();
          } catch (error) {
            this._bell._ignoreSubscriptionState = false;
            throw error;
          }
        });
        return;
      }

      // Handle dialog toggle for all other cases
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
      // Close dialog if already open (toggle behavior)
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
  }
}
