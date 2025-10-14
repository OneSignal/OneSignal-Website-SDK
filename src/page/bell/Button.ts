import { addDomElement, removeDomElement } from 'src/shared/helpers/dom';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import LimitStore from 'src/shared/services/LimitStore';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';
import { BellEvent, MESSAGE_TIMEOUT, MesageType } from './constants';

export default class Button extends AnimatedElement {
  public _isHandlingClick: boolean = false;
  public events: Record<string, string>;
  public bell: Bell;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-button',
      undefined,
      'onesignal-bell-launcher-button-active',
    );

    this.bell = bell;
    this.events = {
      mouse: 'bell.launcher.button.mouse',
    };

    const element = this._element;
    if (element) {
      element.addEventListener(
        'touchstart',
        () => {
          this.onHovering();
          this.onTap();
        },
        { passive: true },
      );

      element.addEventListener('mouseenter', () => {
        this.onHovering();
      });

      element.addEventListener('mouseleave', () => {
        this.onHovered();
      });
      element.addEventListener(
        'touchmove',
        () => {
          this.onHovered();
        },
        { passive: true },
      );

      element.addEventListener('mousedown', () => {
        this.onTap();
      });

      element.addEventListener('mouseup', () => {
        this.onEndTap();
      });

      element.addEventListener('click', () => {
        this.onHovered();
        this.onClick();
      });
    }
  }

  onHovering() {
    if (
      LimitStore.isEmpty(this.events.mouse) ||
      LimitStore.getLast(this.events.mouse) === 'out'
    ) {
      OneSignalEvent.trigger(BellEvent._Hovering);
    }
    LimitStore.put(this.events.mouse, 'over');
  }

  onHovered() {
    LimitStore.put(this.events.mouse, 'out');
    OneSignalEvent.trigger(BellEvent._Hovered);
  }

  onTap() {
    this.pulse();
    this._activate();
    this.bell.badge._activate();
  }

  onEndTap() {
    this._inactivate();
    this.bell.badge._inactivate();
  }

  async onClick() {
    // Prevent concurrent clicks
    if (this._isHandlingClick) return;
    this._isHandlingClick = true;

    OneSignalEvent.trigger(BellEvent._BellClick);
    OneSignalEvent.trigger(BellEvent._LauncherClick);

    try {
      if (
        this.bell.message._shown &&
        this.bell.message.contentType == MesageType._Message
      ) {
        // A message is being shown, it'll disappear soon
        return;
      }

      const optedOut = LimitStore.getLast<boolean>('subscription.optedOut');
      if (this.bell.unsubscribed && !optedOut) {
        // The user is actually subscribed, register him for notifications
        registerForPushNotifications();
        this.bell._ignoreSubscriptionState = true;
        OneSignal._emitter.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
          this.bell.message
            .display(
              MesageType._Message,
              this.bell.options.text['message.action.subscribed'],
              MESSAGE_TIMEOUT,
            )
            .then(() => {
              this.bell._ignoreSubscriptionState = false;
              this.bell.launcher._inactivate();
            });
        });
      }

      // Handle dialog toggle for all other cases
      if (this.bell.unsubscribed || this.bell.subscribed || this.bell.blocked) {
        await this.bell.launcher.activateIfInactive();
        await this._toggleDialog();
      }

      await this.bell.message._hide();
    } finally {
      this._isHandlingClick = false;
    }
  }

  async _toggleDialog() {
    if (this.bell.dialog._shown) {
      // Close dialog if already open (toggle behavior)
      await this.bell.dialog._hide();
      await this.bell.launcher.inactivateIfWasInactive();
    } else {
      await this.bell.showDialogProcedure();
    }
  }

  pulse() {
    removeDomElement('.pulse-ring');
    if (this._element) {
      addDomElement(
        this._element,
        'beforeend',
        '<div class="pulse-ring"></div>',
      );
    }
    this.bell.setCustomColorsIfSpecified();
  }
}
