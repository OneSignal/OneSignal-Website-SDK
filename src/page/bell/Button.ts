import {
  removeDomElement,
  addDomElement,
  isUsingSubscriptionWorkaround,
} from '../../shared/utils/utils';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import ActiveAnimatedElement from './ActiveAnimatedElement';
import Bell from './Bell';
import LimitStore from '../../shared/services/LimitStore';
import Message from './Message';
import InitHelper from '../../shared/helpers/InitHelper';

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
      OneSignalEvent.trigger(Bell.EVENTS.HOVERING);
    }
    LimitStore.put(this.events.mouse, 'over');
  }

  onHovered() {
    LimitStore.put(this.events.mouse, 'out');
    OneSignalEvent.trigger(Bell.EVENTS.HOVERED);
  }

  onTap() {
    this.pulse();
    this.activate();
    this.bell.badge.activate();
  }

  onEndTap() {
    this.inactivate();
    this.bell.badge.inactivate();
  }

  onClick() {
    OneSignalEvent.trigger(Bell.EVENTS.BELL_CLICK);
    OneSignalEvent.trigger(Bell.EVENTS.LAUNCHER_CLICK);

    if (
      this.bell.message.shown &&
      this.bell.message.contentType == Message.TYPES.MESSAGE
    ) {
      // A message is being shown, it'll disappear soon
      return;
    }

    const optedOut = LimitStore.getLast('subscription.optedOut');
    if (this.bell.unsubscribed) {
      if (optedOut) {
        // The user is manually opted out, but still "really" subscribed
        this.bell.launcher.activateIfInactive().then(() => {
          this.bell.showDialogProcedure();
        });
      } else {
        // The user is actually subscribed, register him for notifications
        InitHelper.registerForPushNotifications();
        this.bell._ignoreSubscriptionState = true;
        OneSignal.emitter.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
          this.bell.message
            .display(
              Message.TYPES.MESSAGE,
              this.bell.options.text['message.action.subscribed'],
              Message.TIMEOUT,
            )
            .then(() => {
              this.bell._ignoreSubscriptionState = false;
              this.bell.launcher.inactivate();
            });
        });
      }
    } else if (this.bell.subscribed) {
      this.bell.launcher.activateIfInactive().then(() => {
        this.bell.showDialogProcedure();
      });
    } else if (this.bell.blocked) {
      if (isUsingSubscriptionWorkaround()) {
        // Show the HTTP popup so users can re-allow notifications
        InitHelper.registerForPushNotifications();
      } else {
        this.bell.launcher.activateIfInactive().then(() => {
          this.bell.showDialogProcedure();
        });
      }
    }
    return this.bell.message.hide();
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
    this.bell.setCustomColorsIfSpecified();
  }
}
