import { isPushNotificationsSupported, removeDomElement, addDomElement, clearDomElementChildren, addCssClass, removeCssClass, once, on, off, getConsoleStyle, delay, when, nothing } from '../utils.js';
import Environment from '../environment.js';
import LimitStore from '../limitStore.js';
import log from 'loglevel';
import Event from '../events.js';
import bowser from 'bowser';
import { HOST_URL } from '../vars.js';
import AnimatedElement from './AnimatedElement.js';
import ActiveAnimatedElement from './ActiveAnimatedElement.js';
import Launcher from './Launcher.js';
import Badge from './Badge.js';
import Button from './Button.js';
import Dialog from './Dialog.js';
import Message from './Message.js';

import "./bell.scss";
var logoSvg = require('raw!./bell.svg');

/*
 {
 size = ['small', 'medium', 'large'],
 position = 'bottom-left', 'bottom-right'],
 offset = '15px 15px',
 theme = ['red-white', 'white-red'],
 inactiveOpacity: 0.75,
 showLauncherAfter: 1000,
 messages: {
 'unsubscribed': 'Subscribe to notifications',
 'subscribed': 'You're subscribed to notifications'
 }
 }
 */
export default class Bell {

  static get EVENTS() {
    return {
      STATE_CHANGED: 'onesignal.bell.state.changed',
      LAUNCHER_CLICK: 'onesignal.bell.launcher.click',
      BELL_CLICK: 'onesignal.bell.launcher.button.click',
      SUBSCRIBE_CLICK: 'onesignal.bell.launcher.dialog.button.subscribe.click',
      UNSUBSCRIBE_CLICK: 'onesignal.bell.launcher.dialog.button.unsubscribe.click',
      HOVERING: 'onesignal.bell.hovering',
      HOVERED: 'onesignal.bell.hovered',
    };
  }

  static get STATES() {
    return {
      UNINITIALIZED: 'uninitialized',
      SUBSCRIBED: 'subscribed',
      UNSUBSCRIBED: 'unsubscribed',
      BLOCKED: 'blocked'
    };
  }

  constructor({
    size = 'small',
    position = 'bottom-left',
    theme = 'default',
    showLauncherAfter = 10,
    showBadgeAfter = 300,
    text = {
      'tip.state.unsubscribed': 'Subscribe to notifications',
      'tip.state.subscribed': "You're subscribed to notifications",
      'tip.state.blocked': "You've blocked notifications",
      'tip.action.subscribed': "Thanks for subscribing!",
      'tip.action.unsubscribed': "You won't receive notifications again",
      'dialog.main.title': 'Manage Site Notifications',
      'dialog.main.button.subscribe': 'SUBSCRIBE',
      'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
      'dialog.blocked.title': 'Unblock Notifications',
      'dialog.blocked.message': "Follow these instructions to allow notifications:"
    },
    prenotify = true
    } = {}) {
    this.options = {
      size: size,
      position: position,
      theme: theme,
      showLauncherAfter: showLauncherAfter,
      showBadgeAfter: showBadgeAfter,
      text: text,
      prenotify: prenotify
    };
    if (['small', 'medium', 'large'].indexOf(this.options.size) < 0)
      throw new Error(`Invalid size ${this.options.size} for bell. Choose among 'small', 'medium', or 'large'.`);
    if (['bottom-left', 'bottom-right'].indexOf(this.options.position) < 0)
      throw new Error(`Invalid position ${this.options.position} for bell. Choose either 'bottom-left', or 'bottom-right'.`);
    if (['default', 'inverse'].indexOf(this.options.theme) < 0)
      throw new Error(`Invalid theme ${this.options.theme} for bell. Choose either 'default', or 'inverse'.`);
    if (this.options.showLauncherAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showLauncherAfter} for showing the bell. Choose a value above 0.`);
    if (this.options.showBadgeAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showBadgeAfter} for showing the bell's badge. Choose a value above 0.`);
    this.size = this.options.size;
    this.position = this.options.position;
    this.text = this.options.text;
    this.messages = {};
    this.messages.queued = [];
    if (!this.text['tip.state.unsubscribed'])
      this.text['tip.state.unsubscribed'] = 'Subscribe to notifications';
    if (!this.text['tip.state.subscribed'])
      this.text['tip.state.subscribed'] = "You're subscribed to notifications";
    if (!this.text['tip.state.blocked'])
      this.text['tip.state.blocked'] = "You've blocked notifications";
    if (!this.text['tip.action.subscribed'])
      this.text['tip.action.subscribed'] = "Thanks for subscribing!";
    if (!this.text['tip.action.unsubscribed'])
      this.text['tip.action.unsubscribed'] = "You won't receive notifications again";
    if (!this.text['dialog.main.title'])
      this.text['dialog.main.title'] = 'Manage Site Notifications';
    if (!this.text['dialog.main.button.subscribe'])
      this.text['dialog.main.button.subscribe'] = 'SUBSCRIBE';
    if (!this.text['dialog.main.button.unsubscribe'])
      this.text['dialog.main.button.unsubscribe'] = 'UNSUBSCRIBE';
    if (!this.text['dialog.blocked.title'])
      this.text['dialog.blocked.title'] = 'Unblock Notifications';
    this.messages[Bell.STATES.UNSUBSCRIBED] = this.text['tip.state.unsubscribed'];
    this.messages[Bell.STATES.SUBSCRIBED] = this.text['tip.state.subscribed'];
    this.messages[Bell.STATES.BLOCKED] = this.text['tip.state.blocked'];
    this.state = Bell.STATES.UNINITIALIZED;

    // Install event hooks
    window.addEventListener('focus', (event) => {
      // Checks if permission changed everytime a user focuses on the page, since a user has to click out of and back on the page to check permissions
      OneSignal._checkTrigger_nativePermissionChanged();
    });

    window.addEventListener(Bell.EVENTS.LAUNCHER_CLICK, (event) => {
      this.launcher.activateIfInactive()
        .then(() => this.message.hide())
        .then(() => {
          if (this.unsubscribed) {
            let setSubscriptionState = LimitStore.getLast('setsubscription.value');
            if (setSubscriptionState === false) {
              // The user manually called setSubscription(false), but the user is actually subscribed
              this.showDialogProcedure();
            }
            else {
              // The user is actually subscribed, register him for notifications
              OneSignal.registerForPushNotifications();
            }
          }
          else if (this.subscribed) {
            this.showDialogProcedure();
          }
          else if (this.blocked) {
            this.showDialogProcedure();
          }
        })
        .catch((e) => log.error(e));
    });

    window.addEventListener(Bell.EVENTS.SUBSCRIBE_CLICK, () => {
      Dialog.subscribeButton.disabled = true;
      OneSignal.setSubscription(true);
    });

    window.addEventListener(Bell.EVENTS.UNSUBSCRIBE_CLICK, () => {
      this.launcher.activateIfInactive();

      // If there's already a message being force shown, do not override
      if (this.message.shown || this.dialog.shown) {
        return;
      }

      Promise.resolve(() => {
        if (this.messages.queued.length > 0) {
          return this.message.dequeue().then((msg) => this.message.content = msg);
        } else {
          return Promise.resolve(() => this.message.content = this.messages[this.state]);
        }
      }).then(() => this.message.show())
    });

    window.addEventListener(Bell.EVENTS.HOVERING, () => {
      this.launcher.activateIfInactive();

      // If there's already a message being force shown, do not override
      if (this.message.shown || this.dialog.shown) {
        return;
      }

      Promise.resolve(() => {
        if (this.messages.queued.length > 0) {
          return this.message.dequeue().then((msg) => this.message.content = msg);
        } else {
          return Promise.resolve(() => this.message.content = this.messages[this.state]);
        }
      }).then(() => this.message.show())
    });

    window.addEventListener(Bell.EVENTS.HOVERED, () => {
      if (this.message.shown) {
        this.message.hide()
          .then(() => {
            this.message.content = this.messages[this.state];
            if (this.launcher.wasInactive && !this.dialog.shown) {
              this.launcher.inactivate();
              this.launcher.wasInactive = null;
            }
          });
      }
    });

    window.addEventListener(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, (e) => {
      let isSubscribed = e.detail;
      this.setState(isSubscribed ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
    });

    window.addEventListener(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, (from, to) => {
      this.updateState();
    });

    window.addEventListener(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, (e) => {
      this.message.display(this.text['tip.action.subscribed'], 2500)
        .then(() => {
          this.launcher.inactivate();
        })
        .catch((e) => {
          log.error(e);
        });
    });

    this.updateState();
  }

  showDialogProcedure() {
    if (!this.dialog.shown) {
      this.dialog.show()
        .then((e) => {
          once(document, 'click', (e, destroyEventListener) => {
            let wasDialogClicked = this.dialog.element.contains(e.target);
            if (wasDialogClicked) {
            } else {
              destroyEventListener();
              this.dialog.hide()
                .then((e) => {
                  this.launcher.inactivateIfWasInactive();
                })
                .catch((e) => {
                  log.error(e);
                });
            }
          }, true);
        })
        .catch((e) => {
          log.error(e);
        });
    }
  }

  create() {
    if (!isPushNotificationsSupported())
      return;

    // Remove any existing bell
    if (this.container) {
      removeDomElement('onesignal-bell-container');
    }

    window.addDomElement = addDomElement;
    // Insert the bell container
    addDomElement('body', 'beforeend', '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>');
    // Insert the bell launcher
    addDomElement(this.container, 'beforeend', '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>');
    // Insert the bell launcher button
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-button"></div>');
    // Insert the bell launcher badge
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-badge"></div>');
    // Insert the bell launcher message
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-message"></div>');
    addDomElement(this.message.selector, 'beforeend', '<div class="onesignal-bell-launcher-message-body"></div>');
    // Insert the bell launcher dialog
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog"></div>');
    addDomElement(this.dialog.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog-body"></div>');

    // Install events

    // Add visual elements
    addDomElement(this.button.selector, 'beforeEnd', logoSvg);

    // Add default classes
    this.launcher.resize(this.options.size).then(() => {
      if (this.options.position === 'bottom-left') {
        addCssClass(this.container, 'onesignal-bell-container-bottom-left')
        addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-left')
      }
      else if (this.options.position === 'bottom-right') {
        addCssClass(this.container, 'onesignal-bell-container-bottom-right')
        addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-right')
      }
      else {
        throw new Error('Invalid OneSignal bell position ' + this.options.position);
      }

      if (this.options.theme === 'default') {
        addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-default')
      }
      else if (this.options.theme === 'inverse') {
        addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-inverse')
      }
      else {
        throw new Error('Invalid OneSignal bell theme ' + this.options.theme);
      }

      //this.launcher.inactivate()
      //  .then((result) => {
      //    console.info('Promise resolved yay! Result: ', result);
      //  })

      OneSignal.isPushNotificationsEnabled((pushEnabled) => {
        (pushEnabled ? this.launcher.inactivate() : nothing())
          .then(() => delay(this.options.showLauncherAfter))
          .then(() => this.launcher.show())
          .then(() => delay(this.options.showBadgeAfter))
          .then(() => {
            if (this.options.prenotify && !pushEnabled && OneSignal._isNewVisitor) {
              return this.message.enqueue('Click to subscribe to notifications')
                .then(() => this.badge.show());
            }
            else return nothing();
          })
          .then(() => this.initialized = true)
          .catch((e) => log.error(e));
      });
    });
  }

  _getCurrentSetSubscriptionState() {
    let setSubscriptionState = LimitStore.get('setsubscription.value');
    var currentSetSubscription = setSubscriptionState[setSubscriptionState.length - 1];
    return currentSetSubscription;
  }

  /**
   * Updates the current state to the correct new current state. Returns a promise.
   */
  updateState() {
    OneSignal.isPushNotificationsEnabled((isEnabled) => {
      this.setState(isEnabled ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
      if (LimitStore.getLast('notification.permission') === 'denied') {
        this.setState(Bell.STATES.BLOCKED);
      }
    });

  }

  /**
   * Updates the current state to the specified new state.
   * @param newState One of ['subscribed', 'unsubscribed'].
   */
  setState(newState) {
    console.trace('%cCalled setState().', getConsoleStyle('bold'));
    let lastState = this.state;
    this.state = newState;
    if (lastState !== newState) {
      Event.trigger(Bell.EVENTS.STATE_CHANGED, {from: lastState, to: newState});
      // Update anything that should be changed here in the new state
    }

    // Update anything that should be reset to the same state
    // Unless a display message is being set
    this.message.waitUntilHidden()
      .then(() => this.message.content = this.messages[newState]);
  }

  get container() {
    return document.querySelector('#onesignal-bell-container');
  }

  get launcher() {
    if (!this._launcher)
      this._launcher = new Launcher(this);
    return this._launcher;
  }

  get button() {
    if (!this._button)
      this._button = new Button(this);
    return this._button;
  }

  get badge() {
    if (!this._badge)
      this._badge = new Badge(this);
    return this._badge;
  }

  get message() {
    if (!this._message)
      this._message = new Message(this);
    return this._message;
  }

  get dialog() {
    if (!this._dialog)
      this._dialog = new Dialog(this);
    return this._dialog;
  }

  get subscribed() {
    return this.state === Bell.STATES.SUBSCRIBED;
  }

  get unsubscribed() {
    return this.state === Bell.STATES.UNSUBSCRIBED;
  }

  get blocked() {
    return this.state === Bell.STATES.BLOCKED;
  }
}