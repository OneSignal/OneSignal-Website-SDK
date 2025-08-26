import { addDomElement, removeDomElement } from 'src/shared/helpers/dom';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import LimitStore from 'src/shared/services/LimitStore';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import ActiveAnimatedElement from './ActiveAnimatedElement';
import Bell from './Bell';
import Message from './Message';

export default class Button extends ActiveAnimatedElement {
  public events: any;
  public bell: Bell;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-button',
      undefined,
      undefined,
      'onesignal-bell-launcher-button-active',
      undefined,
      'shown',
      '',
    );

    this.bell = bell;
    this.events = {
      mouse: 'bell.launcher.button.mouse',
    };

    const element = this.element;
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
      OneSignalEvent.trigger(Bell._EVENTS.HOVERING);
    }
    LimitStore.put(this.events.mouse, 'over');
  }

  onHovered() {
    LimitStore.put(this.events.mouse, 'out');
    OneSignalEvent.trigger(Bell._EVENTS.HOVERED);
  }

  onTap() {
    this.pulse();
    this.activate();
    this.bell.__badge.activate();
  }

  onEndTap() {
    this.inactivate();
    this.bell.__badge.inactivate();
  }

  onClick() {
    OneSignalEvent.trigger(Bell._EVENTS.BELL_CLICK);
    OneSignalEvent.trigger(Bell._EVENTS.LAUNCHER_CLICK);

    if (
      this.bell.__message.shown &&
      this.bell.__message.contentType == Message.TYPES.MESSAGE
    ) {
      // A message is being shown, it'll disappear soon
      return;
    }

    const optedOut = LimitStore.getLast<boolean>('subscription.optedOut');
    if (this.bell._unsubscribed) {
      if (optedOut) {
        // The user is manually opted out, but still "really" subscribed
        this.bell.__launcher.activateIfInactive().then(() => {
          this.bell._showDialogProcedure();
        });
      } else {
        // The user is actually subscribed, register him for notifications
        registerForPushNotifications();
        this.bell._ignoreSubscriptionState = true;
        OneSignal.emitter.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
          this.bell.__message
            .display(
              Message.TYPES.MESSAGE,
              this.bell._options.text['message.action.subscribed'],
              Message.TIMEOUT,
            )
            .then(() => {
              this.bell._ignoreSubscriptionState = false;
              this.bell.__launcher.inactivate();
            });
        });
      }
    } else if (this.bell._subscribed) {
      this.bell.__launcher.activateIfInactive().then(() => {
        this.bell._showDialogProcedure();
      });
    } else if (this.bell._blocked) {
      this.bell.__launcher.activateIfInactive().then(() => {
        this.bell._showDialogProcedure();
      });
    }
    return this.bell.__message.hide();
  }

  pulse() {
    removeDomElement('.pulse-ring');
    if (this.element) {
      addDomElement(
        this.element,
        'beforeend',
        '<div class="pulse-ring"></div>',
      );
    }
    this.bell._setCustomColorsIfSpecified();
  }
}
