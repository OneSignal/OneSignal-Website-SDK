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

    this.element.addEventListener('touchstart', (e) => {
      this.onHovering(e);
      this.onTap(e);
    });

    this.element.addEventListener('mouseenter', (e) => {
      this.onHovering(e);
    });

    this.element.addEventListener('mouseleave', (e) => {
      this.onHovered(e);
    });
    this.element.addEventListener('touchmove', (e) => {
      this.onHovered(e);
    });

    this.element.addEventListener('mousedown', (e) => {
      this.onTap(e);
    });

    this.element.addEventListener('mouseup', (e) => {
      this.onEndTap(e);
    });

    this.element.addEventListener('click', (e) => {
      this.onHovered(e);
      this.onClick(e);
    });
  }

  onHovering(e) {
    if (LimitStore.isEmpty(this.events.mouse) || LimitStore.getLast(this.events.mouse) === 'out') {
      Event.trigger(Bell.EVENTS.HOVERING);
    }
    LimitStore.put(this.events.mouse, 'over');
  }

  onHovered(e) {
    LimitStore.put(this.events.mouse, 'out');
    Event.trigger(Bell.EVENTS.HOVERED);
  }

  onTap(e) {
    this.pulse();
    this.activate();
    this.bell.badge.activate();
  }

  onEndTap(e) {
    this.inactivate();
    this.bell.badge.inactivate();
  }

  onClick(e) {
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
        //// Show the 'Click Allow to receive notifications' tip, if they haven't already enabled permissions
        //if (OneSignal.getNotificationPermission() === 'default') {
        //  this.bell.message.display(Message.TYPES.MESSAGE, this.bell.text['message.action.subscribing'], Message.TIMEOUT)
        //}
        this.bell._ignoreSubscriptionState = true;
        OneSignal.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, isSubscribed => {
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