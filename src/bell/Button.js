import { isPushNotificationsSupported, getConsoleStyle, addCssClass, removeCssClass, removeDomElement, once, when } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import ActiveAnimatedElement from './ActiveAnimatedElement.js';
import Bell from './bell.js';
import LimitStore from '../limitStore.js';
import Message from './Message.js';


export default class Button extends ActiveAnimatedElement {

  constructor(bell) {
    super('.onesignal-bell-launcher-button', null, null, 'onesignal-bell-launcher-button-active', null, 'shown', []);

    this.bell = bell;
    this.events = {
      mouse: 'bell.launcher.button.mouse'
    };

    this.element.addEventListener('touchstart', (e) => {
      //log.debug('touchstart');
      this.onHovering(e);
      this.onTap(e);
    });

    this.element.addEventListener('mouseenter', (e) => {
      //log.debug('mouseenter');
      this.onHovering(e);
    });

    this.element.addEventListener('mouseleave', (e) => {
      //log.debug('mouseleave');
      this.onHovered(e);
    });
    this.element.addEventListener('touchmove', (e) => {
      //log.debug('touchmove');
      this.onHovered(e);
    });

    this.element.addEventListener('mousedown', (e) => {
      //log.debug('mousedown');
      this.onTap(e);
    });

    this.element.addEventListener('mouseup', (e) => {
      //log.debug('mouseup');
      this.onEndTap(e);
    });

    this.element.addEventListener('click', (e) => {
      //log.debug('click');
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

    var setSubscriptionState = LimitStore.getLast('setsubscription.value');
    if (this.bell.unsubscribed) {
      if (setSubscriptionState === false) {
        // The user manually called setSubscription(false), but the user is actually subscribed
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
            })
            .catch((e) => {
              log.error(e);
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
      if (OneSignal.isUsingSubscriptionWorkaround()) {
        // Show the HTTP popup so users can re-allow notifications
        OneSignal.registerForPushNotifications();
      } else {
        this.bell.launcher.activateIfInactive().then(() => {
          this.bell.showDialogProcedure();
        });
      }
    }
    return this.bell.message.hide().catch((e) => log.error(e));
  }

  pulse() {
    removeDomElement('.pulse-ring');
    addDomElement(this.element, 'beforeend', '<div class="pulse-ring"></div>');
    this.bell.setCustomColorsIfSpecified();
  }
}