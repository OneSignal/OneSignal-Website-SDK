import { isPushNotificationsSupported, removeDomElement, addDomElement, clearDomElementChildren, addCssClass, removeCssClass, once, on, off, getConsoleStyle, delay, when, nothing } from '../utils.js';
import Environment from '../environment.js';
import LimitStore from '../limitStore.js';
import log from 'loglevel';
import Event from '../events.js';
import * as Browser from 'bowser';
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


export default class Bell {

  static get EVENTS() {
    return {
      STATE_CHANGED: 'onesignal.nb.state.changed',
      LAUNCHER_CLICK: 'onesignal.nb.launcher.click',
      BELL_CLICK: 'onesignal.nb.launcher.button.click',
      SUBSCRIBE_CLICK: 'onesignal.nb.launcher.dialog.button.subscribe.click',
      UNSUBSCRIBE_CLICK: 'onesignal.nb.launcher.dialog.button.unsubscribe.click',
      HOVERING: 'onesignal.nb.hovering',
      HOVERED: 'onesignal.nb.hovered',
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

  static get TEXT_SUBS() {
    return {
      'prompt.native.grant': {
        default: 'Allow',
        chrome: 'Allow',
        firefox: 'Always Receive Notifications',
        safari: 'Allow'
      }
    }
  }

  substituteText() {
    // key: 'message.action.subscribing'
    // value: 'Click <strong>{{prompt.native.grant}}</strong> to receive notifications'
    for (var key in this.text) {
      if (this.text.hasOwnProperty(key)) {
        let value = this.text[key];
        // browserName could be 'chrome' or 'firefox' or 'safari'
        let browserName = Browser.name.toLowerCase();

        // tKey: 'prompt.native.grant'  (from TEXT_SUBS)
        // tValue: { chrome: 'Allow', firefox: 'Al... }
        // zValue: 'Allow', if browserName === 'chrome'
        for (var tKey in Bell.TEXT_SUBS) {
          if (Bell.TEXT_SUBS.hasOwnProperty(tKey)) {
            let tValue = Bell.TEXT_SUBS[tKey];
            let zValue = tValue[browserName];
            if (value && value.indexOf('{{') > -1) {
              this.text[key] = value.replace(`{{${tKey}}}`, (zValue !== undefined ? zValue : tValue['default']));
            }
          }
        }
      }
    }
  }

  constructor({
    enable = false,
    size = 'medium',
    position = 'bottom-right',
    theme = 'default',
    showLauncherAfter = 10,
    showBadgeAfter = 300,
    text = {
      'tip.state.unsubscribed': 'Subscribe to notifications',
      'tip.state.subscribed': "You're subscribed to notifications",
      'tip.state.blocked': "You've blocked notifications",
      'message.prenotify': 'Click to subscribe to notifications',
      'message.action.subscribing': "Click <strong>{{prompt.native.grant}}</strong> to receive notifications",
      'message.action.subscribed': "Thanks for subscribing!",
      'message.action.resubscribed': "You're subscribed to notifications",
      'message.action.unsubscribed': "You won't receive notifications again",
      'dialog.main.title': 'Manage Site Notifications',
      'dialog.main.button.subscribe': 'SUBSCRIBE',
      'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
      'dialog.blocked.title': 'Unblock Notifications',
      'dialog.blocked.message': "Follow these instructions to allow notifications:"
    },
    prenotify = true,
    showCredit = true
    } = {}) {
    this.options = {
      enable: enable,
      size: size,
      position: position,
      theme: theme,
      showLauncherAfter: showLauncherAfter,
      showBadgeAfter: showBadgeAfter,
      text: text,
      prenotify: prenotify,
      showCredit: showCredit,
    };

    if (!this.options.enable)
      return;

    if (['small', 'medium', 'large'].indexOf(this.options.size) < 0)
      throw new Error(`Invalid size ${this.options.size} for notify button. Choose among 'small', 'medium', or 'large'.`);
    if (['bottom-left', 'bottom-right'].indexOf(this.options.position) < 0)
      throw new Error(`Invalid position ${this.options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`);
    if (['default', 'inverse'].indexOf(this.options.theme) < 0)
      throw new Error(`Invalid theme ${this.options.theme} for notify button. Choose either 'default', or 'inverse'.`);
    if (this.options.showLauncherAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showLauncherAfter} for showing the notify button. Choose a value above 0.`);
    if (this.options.showBadgeAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showBadgeAfter} for showing the notify button's badge. Choose a value above 0.`);
    this.size = this.options.size;
    this.position = this.options.position;
    this.text = this.options.text;
    if (!this.text['tip.state.unsubscribed'])
      this.text['tip.state.unsubscribed'] = 'Subscribe to notifications';
    if (!this.text['tip.state.subscribed'])
      this.text['tip.state.subscribed'] = "You're subscribed to notifications";
    if (!this.text['tip.state.blocked'])
      this.text['tip.state.blocked'] = "You've blocked notifications";
    if (!this.text['message.prenotify'])
      this.text['message.prenotify'] = "Click to subscribe to notifications";
    if (!this.text['message.action.subscribed'])
      this.text['message.action.subscribed'] = "Thanks for subscribing!";
    if (!this.text['message.action.resubscribed'])
      this.text['message.action.resubscribed'] = "You're subscribed to notifications";
    if (!this.text['message.action.subscribing'])
      this.text['message.action.subscribing'] = "Click <strong>{{prompt.native.grant}}</strong> to receive notifications";
    if (!this.text['message.action.unsubscribed'])
      this.text['message.action.unsubscribed'] = "You won't receive notifications again";
    if (!this.text['dialog.main.title'])
      this.text['dialog.main.title'] = 'Manage Site Notifications';
    if (!this.text['dialog.main.button.subscribe'])
      this.text['dialog.main.button.subscribe'] = 'SUBSCRIBE';
    if (!this.text['dialog.main.button.unsubscribe'])
      this.text['dialog.main.button.unsubscribe'] = 'UNSUBSCRIBE';
    if (!this.text['dialog.blocked.title'])
      this.text['dialog.blocked.title'] = 'Unblock Notifications';
    if (!this.text['dialog.blocked.message'])
      this.text['dialog.blocked.message'] = 'Follow these instructions to allow notifications:';
    this.substituteText();
    this.state = Bell.STATES.UNINITIALIZED;

    // Install event hooks
    window.addEventListener(Bell.EVENTS.SUBSCRIBE_CLICK, () => {
      this.dialog.subscribeButton.disabled = true;
      OneSignal.setSubscription(true)
        .then(() => {
          this.dialog.subscribeButton.disabled = false;
          return this.dialog.hide();
        })
        .then(() => {
          return this.message.display(Message.TYPES.MESSAGE, this.text['message.action.resubscribed'], Message.TIMEOUT);
        })
        .then(() => {
            this.launcher.clearIfWasInactive();
            return this.launcher.inactivate();
        });
    });

    window.addEventListener(Bell.EVENTS.UNSUBSCRIBE_CLICK, () => {
      this.dialog.unsubscribeButton.disabled = true;
      OneSignal.setSubscription(false)
        .then(() => {
          this.dialog.unsubscribeButton.disabled = false;
          return this.dialog.hide();
        })
        .then(() => {
          this.launcher.clearIfWasInactive();
          return this.launcher.activate();
        })
        .then(() => {
          return this.message.display(Message.TYPES.MESSAGE, this.text['message.action.unsubscribed'], Message.TIMEOUT);
        });
    });

    window.addEventListener(Bell.EVENTS.HOVERING, () => {
      this.hovering = true;
      this.launcher.activateIfInactive();

      // If there's already a message being force shown, do not override
      if (this.message.shown || this.dialog.shown) {
        this.hovering = false;
        return;
      }

      // If the message is a message and not a tip, don't show it (only show tips)
      // Messages will go away on their own
      if (this.message.contentType === Message.TYPES.MESSAGE) {
        this.hovering = false;
        return;
      }

      new Promise((resolve, reject) => {
        // If a message is being shown
        if (this.message.queued.length > 0) {
          return this.message.dequeue().then((msg) => {
            this.message.content = msg;
            this.message.contentType = Message.TYPES.QUEUED;
            resolve();
          });
        } else {
          this.message.content = this.message.getTipForState();
          this.message.contentType = Message.TYPES.TIP;
          resolve();
        }
      }).then(() => {
          return this.message.show();
        })
        .then(() => {
          this.hovering = false;
        })
    });

    window.addEventListener(Bell.EVENTS.HOVERED, () => {
      // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
      if (this.message.contentType === Message.TYPES.MESSAGE) {
        return;
      }

      if (!this.dialog.hidden) {
        // If the dialog is being brought up when clicking button, don't shrink
        return;
      }

      if (this.hovering) {
        this.hovering = false;
        // Hovering still being true here happens on mobile where the message could still be showing (i.e. animating) when a HOVERED event fires
        // In other words, you tap on mobile, HOVERING fires, and then HOVERED fires immediately after because of the way mobile click events work
        // Basically only happens if HOVERING and HOVERED fire within a few milliseconds of each other
        this.message.waitUntilShown()
          .then(() => delay(Message.TIMEOUT))
          .then(() => this.message.hide())
          .then(() => {
            if (this.launcher.wasInactive && this.dialog.hidden) {
              this.launcher.inactivate();
              this.launcher.wasInactive = null;
            }
          });
      }


      if (this.message.shown) {
        this.message.hide()
          .then(() => {
            if (this.launcher.wasInactive && this.dialog.hidden) {
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
    });

    this.updateState();
  }

  showDialogProcedure() {
    if (!this.dialog.shown) {
      this.dialog.show()
        .then((e) => {
          //var id = Math.random().toString(36).substring(7, 11);
          //console.warn(`Generating %cshowDialogProcedure(${id}):`, getConsoleStyle('code'), '.');
          once(document, 'click', (e, destroyEventListener) => {
            let wasDialogClicked = this.dialog.element.contains(e.target);
            if (wasDialogClicked) {
            } else {
              //console.warn(`%cshowDialogProcedure(${id}):`, getConsoleStyle('code'), 'A destroying click was detected.');
              destroyEventListener();
              if (this.dialog.shown) {
                this.dialog.hide()
                  .then((e) => {
                    this.launcher.inactivateIfWasInactive();
                  })
                  .catch((e) => {
                    log.error(e);
                  });
              }
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

    if (!this.options.enable)
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

    new Promise(resolve => {
      OneSignal.isPushNotificationsEnabled((isPushEnabled) => {
        resolve(isPushEnabled)
      });
    })
    .then(isPushEnabled => {
      // Resize to small instead of specified size if enabled, otherwise there's a jerking motion where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
      let resizeTo = (isPushEnabled ? 'small' : this.options.size);
      // Add default classes
      this.launcher.resize(resizeTo).then(() => {
        if (this.options.position === 'bottom-left') {
          addCssClass(this.container, 'onesignal-bell-container-bottom-left')
          addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-left')
        }
        else if (this.options.position === 'bottom-right') {
          addCssClass(this.container, 'onesignal-bell-container-bottom-right')
          addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-right')
        }
        else {
          throw new Error('Invalid OneSignal notify button position ' + this.options.position);
        }

        if (this.options.theme === 'default') {
          addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-default')
        }
        else if (this.options.theme === 'inverse') {
          addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-inverse')
        }
        else {
          throw new Error('Invalid OneSignal notify button theme ' + this.options.theme);
        }

        log.info('Showing the notify button.');

        (isPushEnabled ? this.launcher.inactivate() : nothing())
          .then(() => delay(this.options.showLauncherAfter))
          .then(() => {
            return this.launcher.show();
          })
          .then(() => {
            return delay(this.options.showBadgeAfter);
          })
          .then(() => {
            if (this.options.prenotify && !isPushEnabled && OneSignal._isNewVisitor) {
              return this.message.enqueue(this.text['message.prenotify'])
                .then(() => this.badge.show());
            }
            else return nothing();
          })
          .then(() => this.initialized = true)
          .catch((e) => log.error(e));
      }).catch(e => log.error(e));
    });
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
    let lastState = this.state;
    this.state = newState;
    if (lastState !== newState) {
      Event.trigger(Bell.EVENTS.STATE_CHANGED, {from: lastState, to: newState});
      // Update anything that should be changed here in the new state
    }

    // Update anything that should be reset to the same state
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