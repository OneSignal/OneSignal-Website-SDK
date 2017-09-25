import {removeDomElement, addDomElement} from "../utils";
import Event from "../Event";
import ActiveAnimatedElement from "./ActiveAnimatedElement";
import Bell from "./Bell";
import LimitStore from "../LimitStore";
import Message from "./Message";
import SubscriptionHelper from "../helpers/SubscriptionHelper";


export default class Button extends ActiveAnimatedElement {

  public events: any;
  public bell: any;

  constructor(bell) {
    super('.onesignal-bell-launcher-button', null, null, 'onesignal-bell-launcher-button-active', null, 'shown', '');

    this.bell = bell;
    this.events = {
      mouse: 'bell.launcher.button.mouse'
    };

    this.element.addEventListener('touchstart', () => {
      this.onHovering();
      this.onTap();
    }, { passive: true });

    this.element.addEventListener('mouseenter', () => {
      this.onHovering();
    });

    this.element.addEventListener('mouseleave', () => {
      this.onHovered();
    });
    this.element.addEventListener('touchmove', () => {
      this.onHovered();
    }, { passive: true });

    this.element.addEventListener('mousedown', () => {
      this.onTap();
    });

    this.element.addEventListener('mouseup', () => {
      this.onEndTap();
    });

    this.element.addEventListener('click', () => {
      this.onHovered();
      this.onClick();
    });
  }

  onHovering() {
    if (LimitStore.isEmpty(this.events.mouse) || LimitStore.getLast(this.events.mouse) === 'out') {
      Event.trigger(Bell.EVENTS.HOVERING);
    }
    LimitStore.put(this.events.mouse, 'over');
  }

  onHovered() {
    LimitStore.put(this.events.mouse, 'out');
    Event.trigger(Bell.EVENTS.HOVERED);
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
    Event.trigger(Bell.EVENTS.BELL_CLICK);
    Event.trigger(Bell.EVENTS.LAUNCHER_CLICK);

    if (this.bell.message.shown && this.bell.message.contentType == Message.TYPES.MESSAGE) {
      // A message is being shown, it'll disappear soon
      return;
    }

    var optedOut = LimitStore.getLast('subscription.optedOut');
    if (this.bell.unsubscribed) {
      if (optedOut) {
        // The user is manually opted out, but still "really" subscribed
        this.bell.launcher.activateIfInactive().then(() => {
          this.bell.showDialogProcedure();
        });
      }
      else {
        // The user is actually subscribed, register him for notifications
        OneSignal.registerForPushNotifications();
        this.bell._ignoreSubscriptionState = true;
        OneSignal.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
          this.bell.message.display(Message.TYPES.MESSAGE, this.bell.text['message.action.subscribed'], Message.TIMEOUT)
            .then(() => {
              this.bell._ignoreSubscriptionState = false;
              this.bell.launcher.inactivate();
            });
        });
      }
    }
    else if (this.bell.subscribed) {
      this.bell.launcher.activateIfInactive().then(() => {
        this.bell.showDialogProcedure();
      });
    }
    else if (this.bell.blocked) {
      if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
        // Show the HTTP popup so users can re-allow notifications
        OneSignal.registerForPushNotifications();
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
    addDomElement(this.element, 'beforeend', '<div class="pulse-ring"></div>');
    this.bell.setCustomColorsIfSpecified();
  }
}
