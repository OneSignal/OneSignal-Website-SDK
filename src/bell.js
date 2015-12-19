import { isPushNotificationsSupported, removeDomElement, addDomElement, clearDomElementChildren, addCssClass, removeCssClass, once, on, off, getConsoleStyle } from './utils.js';
import Environment from './environment.js';
import LimitStore from './limitStore.js';
import log from 'loglevel';
import Event from './events.js'
import bowser from 'bowser';
import { HOST_URL } from './vars.js';
import AnimatedElement from './AnimatedElement.js'
import ActiveAnimatedElement from './ActiveAnimatedElement.js'

if (Environment.isBrowser()) {
  require("./bell.scss");
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
  class Bell {

    static get EVENTS() {
      return {
        STATE_CHANGED: 'onesignal.bell.state.changed',
        LAUNCHER_CLICK: 'onesignal.bell.launcher.click',
        BELL_CLICK: 'onesignal.bell.launcher.button.click',
        SUBSCRIBE_CLICK: 'onesignal.bell.launcher.dialog.button.subscribe.click',
        UNSUBSCRIBE_CLICK: 'onesignal.bell.launcher.dialog.button.unsubscribe.click',
        HOVERING: 'onesignal.bell.hovering',
        HOVERED: 'onesignal.bell.hovered',
        MESSAGE_DISPLAYED: 'onesignal.bell.launcher.message.displayed',
        MESSAGE_HIDDEN: 'onesignal.bell.launcher.message.hidden',
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
      this.notificationIcons = null;

      // Install event hooks
      window.addEventListener(Bell.EVENTS.STATE_CHANGED, (state) => {
        state = state.detail
        if (state.to === Bell.STATES.SUBSCRIBED) {
          if (this.notificationIcons === null) {
            this.getNotificationIcons().then((icons) => {
              this.notificationIcons = icons;
            });
          }
        }
      });

      this.subscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
      this.unsubscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';

      window.addEventListener('focus', (event) => {
        // Checks if permission changed everytime a user focuses on the page, since a user has to click out of and back on the page to check permissions
        OneSignal._checkTrigger_nativePermissionChanged();
      });

      window.addEventListener('click', (event) => {
        if (event.target === document.querySelector(this.subscribeButtonId))
          Event.trigger(Bell.EVENTS.SUBSCRIBE_CLICK);
        else if (event.target === document.querySelector(this.unsubscribeButtonId))
          Event.trigger(Bell.EVENTS.UNSUBSCRIBE_CLICK);
      });

      window.addEventListener(Bell.EVENTS.SUBSCRIBE_CLICK, (event) => {
        OneSignal.setSubscription(true);
        console.warn('tip.action.subscribed', this.text['tip.action.subscribed']);
        this.displayMessage(this.text['tip.action.subscribed'], 2500).then(() => {
          this.updateState();
        });
        this.hideDialog();
      });

      window.addEventListener(Bell.EVENTS.UNSUBSCRIBE_CLICK, (event) => {
        OneSignal.setSubscription(false);
        console.warn('tip.action.unsubscribed', this.text['tip.action.unsubscribed']);
        this.displayMessage(this.text['tip.action.unsubscribed'], 2500).then(() => {
          this.updateState();
        });
        this.hideDialog();
      });

      window.addEventListener(Bell.EVENTS.LAUNCHER_CLICK, (event) => {
        var originalCall = () => {
          log.debug('Bell was clicked.');
          let currentSetSubscriptionState = this._getCurrentSetSubscriptionState();
          this.hideMessage();
          if (this.state === Bell.STATES.UNSUBSCRIBED) {
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
          else if (this.state === Bell.STATES.SUBSCRIBED) {
            this.showDialogProcedure();
          }
          else if (this.state === Bell.STATES.BLOCKED) {
            this.showDialogProcedure();
          }
        };
        if (this.isInactive()) {
          this.wasInactive = true;
          this.setInactive(false)
            .then(function () {
              originalCall();
            })
            .catch(function (e) {
              log.error(e);
            })
        } else {
          originalCall();
        }
      });

      window.addEventListener(Bell.EVENTS.HOVERING, () => {
        if (this.isInactive()) {
          this.wasInactive = true;
          this.setInactive(false);
        }
        // If there's already a message being force shown, do not override
        if (this.isMessageOpened() || this.isDialogOpened()) {
          console.debug('There is already a message being displayed; wait until it is hidden again.');
          return;
        }
        if (this.messages.queued.length > 0) {
          let dequeuedMessage = this.dequeueMessage();
          this.setMessage(dequeuedMessage);
        } else {
          this.setMessage(this.messages[this.state]);
        }
        this.showMessage();
      });

      window.addEventListener(Bell.EVENTS.HOVERED, () => {
        if (this.isMessageOpened()) {
          this.hideMessage()
            .then(() => {
              this.setMessage(this.messages[this.state]);
              if (this.wasInactive && !this.isDialogOpened()) {
                this.setInactive(true);
                this.wasInactive = undefined;
              }
            });
        }
      });

      window.addEventListener(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, (e) => {
        this.setState(e.detail ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
      });

      window.addEventListener(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, (from, to) => {
        this.updateState();
      });

      window.addEventListener(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, (e) => {
        this.displayMessage(this.text['tip.action.subscribed'], 2500)
          .then(() => {
            this.setInactive(true);
          })
          .catch((e) => {
            log.error(e);
          });
      });

      this.updateState();
    }

    showDialogProcedure() {
      if (!this.isDialogOpened()) {
        this.showDialog()
          .then((e) => {
            once(document, 'click', (e, destroyEventListener) => {
              let wasDialogClicked = this.launcherDialog.contains(e.target);
              if (wasDialogClicked) {
              } else {
                destroyEventListener();
                this.hideDialog()
                  .then((e) => {
                    if (this.wasInactive) {
                      this.setInactive(true);
                      this.wasInactive = undefined;
                    }
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
      addDomElement(this.launcher, 'beforeend', '<div class="onesignal-bell-launcher-button"></div>');
      // Insert the bell launcher badge
      addDomElement(this.launcher, 'beforeend', '<div class="onesignal-bell-launcher-badge"></div>');
      // Insert the bell launcher message
      addDomElement(this.launcher, 'beforeend', '<div class="onesignal-bell-launcher-message"></div>');
      addDomElement(this.launcherMessage, 'beforeend', '<div class="onesignal-bell-launcher-message-body"></div>');
      // Insert the bell launcher dialog
      addDomElement(this.launcher, 'beforeend', '<div class="onesignal-bell-launcher-dialog"></div>');
      addDomElement(this.launcherDialog, 'beforeend', '<div class="onesignal-bell-launcher-dialog-body"></div>');

      // Install events
      this.launcherButton.addEventListener('mouseover', () => {
        let eventName = 'bell.launcherButton.mouse';
        if (LimitStore.isEmpty(eventName) || LimitStore.getLast(eventName) === 'out') {
          Event.trigger(Bell.EVENTS.HOVERING);
        }
        LimitStore.put('bell.launcherButton.mouse', 'over');
      });

      this.launcherButton.addEventListener('mouseleave', () => {
        LimitStore.put('bell.launcherButton.mouse', 'out');
        Event.trigger(Bell.EVENTS.HOVERED);
      });

      this.launcherButton.addEventListener('mousedown', () => {
        removeDomElement('.pulse-ring');
        addDomElement(this.launcherButton, 'beforeend', '<div class="pulse-ring"></div>');
        addCssClass(this.launcherButton, 'onesignal-bell-launcher-button-active');
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-active');
      });

      this.launcherButton.addEventListener('mouseup', () => {
        removeCssClass(this.launcherButton, 'onesignal-bell-launcher-button-active');
        removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-active');
      });

      this.launcherButton.addEventListener('click', () => {
        Event.trigger(Bell.EVENTS.BELL_CLICK);
        Event.trigger(Bell.EVENTS.LAUNCHER_CLICK);
      });

      // Add visual elements
      addDomElement(this.launcherButton, 'beforeEnd', logoSvg);

      // Add default classes
      this.setSize(this.options.size);

      if (this.options.position === 'bottom-left') {
        addCssClass(this.container, 'onesignal-bell-container-bottom-left')
        addCssClass(this.launcher, 'onesignal-bell-launcher-bottom-left')
      }
      else if (this.options.position === 'bottom-right') {
        addCssClass(this.container, 'onesignal-bell-container-bottom-right')
        addCssClass(this.launcher, 'onesignal-bell-launcher-bottom-right')
      }
      else {
        throw new Error('Invalid OneSignal bell position ' + this.options.position);
      }

      if (this.options.theme === 'default') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-theme-default')
      }
      else if (this.options.theme === 'inverse') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-theme-inverse')
      }
      else {
        throw new Error('Invalid OneSignal bell theme ' + this.options.theme);
      }

      OneSignal.isPushNotificationsEnabled((isPushEnabled) => {
        if (isPushEnabled) {
          var promise = this.setInactive(true);
        } else {
          var promise = Promise.resolve(); // Do nothing, returns a promise that executes immediately
        }

        promise.then(() => {
          this._scheduleEvent(this.options.showLauncherAfter, () => {
            this.showLauncher();
          })
            .then(() => {
              return this._scheduleEvent(this.options.showBadgeAfter, () => {
                if (this.options.prenotify && OneSignal._isNewVisitor) {
                  if (!isPushEnabled) {
                    this.enqueueMessage('Click to subscribe to notifications');
                    this.showBadge();
                  }
                }
                this.initialized = true;
              });
            })
            .catch((e) => {
              log.error(e);
            });
        });
      });
    }

    _getCurrentSetSubscriptionState() {
      let setSubscriptionState = LimitStore.get('setsubscription.value');
      var currentSetSubscription = setSubscriptionState[setSubscriptionState.length - 1];
      return currentSetSubscription;
    }

    updateBellLauncherDialogBody() {
      return new Promise((resolve, reject) => {
        clearDomElementChildren(this.launcherDialogBody);

        let currentSetSubscription = this._getCurrentSetSubscriptionState();
        let contents = 'Nothing to show.';

        if (this.state === Bell.STATES.SUBSCRIBED && currentSetSubscription === true ||
          this.state === Bell.STATES.UNSUBSCRIBED && currentSetSubscription === false) {

          let notificationIconHtml = '';
          let imageUrl = this.getPlatformNotificationIcon();
          if (imageUrl) {
            notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`
          } else {
            notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`
          }

          let buttonHtml = '';
          if (this.state !== Bell.STATES.SUBSCRIBED)
            buttonHtml = `<button type="button" class="action" id="subscribe-button">${this.text['dialog.main.button.subscribe']}</button>`;
          else
            buttonHtml = `<button type="button" class="action" id="unsubscribe-button">${this.text['dialog.main.button.unsubscribe']}</button>`;


          contents = `
                  <h1>${this.text['dialog.main.title']}</h1>
                  <div class="divider"></div>
                  <div class="push-notification">
                    ${notificationIconHtml}
                    <div class="push-notification-text-container">
                      <div class="push-notification-text push-notification-text-short"></div>
                      <div class="push-notification-text"></div>
                      <div class="push-notification-text push-notification-text-medium"></div>
                      <div class="push-notification-text"></div>
                      <div class="push-notification-text push-notification-text-medium"></div>
                    </div>
                  </div>
                  <div class="action-container">
                    ${buttonHtml}
                  </div>
                  <div class="divider"></div>
                  <div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>
                `;
        }
        else if (this.state === Bell.STATES.BLOCKED) {
          let imageUrl = null;
          if (bowser.chrome)
            imageUrl = HOST_URL + '/bell/chrome-unblock.jpg';
          else if (bowser.firefox)
            imageUrl = HOST_URL + '/bell/firefox-unblock.jpg';
          else if (bowser.safari)
            imageUrl = HOST_URL + '/bell/safari-unblock.jpg';

          let instructionsHtml = '';
          if (imageUrl) {
            instructionsHtml = `
            <div class="instructions">
              <a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>
            </div>
            `;
          }
          contents = `
                  <h1>${this.text['dialog.blocked.title']}</h1>
                  <div class="divider"></div>
                  <div class="instructions">
                  <p>${this.text['dialog.blocked.message']}</p>
                  ${instructionsHtml}
                  </div>
                  <div class="divider"></div>
                  <div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>
                `;
        }

        addDomElement(this.launcherDialogBody, 'beforeend', contents);
        resolve();
      });
    }

    getNotificationIcons() {
      if (!OneSignal._app_id) {
        return Promise.resolve(null);
      }
      let url = `${OneSignal._API_URL}apps/${OneSignal._app_id}/icon`;
      return new Promise((resolve, reject) => {
        fetch(url)
          .then(function(response) {
            return response.json()
          }).then(function(data) {
            if (data.errors) {
              console.error(`API call %c${url}`, getConsoleStyle('code'), 'failed with:', data.errors);
              reject(null);
            }
            resolve(data);
          }).catch(function(ex) {
            console.error('Call %cgetNotificationIcons()', getConsoleStyle('code'), 'failed with:', ex);
            reject(null);
          })
      });
    }

    getPlatformNotificationIcon() {
      if (this.notificationIcons) {
        if (bowser.chrome || bowser.firefox) {
          return this.notificationIcons.chrome || this.notificationIcons.safari;
        }
        else if (bowser.safari) {
          return this.notificationIcons.safari || this.notificationIcons.chrome;
        }
      }
      else return null;
    }

    _scheduleEvent(msInFuture, task) {
      if (typeof task !== 'function')
        throw new Error('Task to be scheduled must be a function.');
      if (msInFuture <= 0) {
        task();
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          task();
          resolve();
        }, msInFuture);
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

    waitMessageHidden() {
      if (this.isMessageOpened()) {
        return new Promise((resolve) => {
          once(window, Bell.EVENTS.MESSAGE_HIDDEN, () => {
            resolve();
          });
        });
      } else {
        return Promise.resolve();
      }
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
      this.waitMessageHidden().then(() => {
        this.setMessage(this.messages[newState]);
      });
    }

    enqueueMessage(message, notify = false) {
      this.messages.queued.push(message);
      if (this.isBadgeOpen()) {
        this.hideBadge()
          .then(() => {
            this.incrementBadge();
            this.showBadge();
          });
      } else {
        this.incrementBadge();
        // Special case so the badge doesn't immediately render
        if (this.initialized) {
          this.showBadge();
        }
      }
    }

    dequeueMessage(message) {
      let dequeuedMessage = this.messages.queued.pop(message);
      if (this.isBadgeOpen()) {
        this.hideBadge()
          .then(() => {
            this.decrementBadge();
            this.showBadge();
          });
      } else {
        let newBadgeNumber = this.decrementBadge();
        if (newBadgeNumber <= 0) {
          this.hideBadge();
        }
      }
      return dequeuedMessage;
    }

    showDialog() {
      return new Promise((resolve, reject) => {
        this.updateBellLauncherDialogBody().then(() => {
          addCssClass(this.launcherDialog, 'onesignal-bell-launcher-dialog-opened');
          once(this.launcherDialog, 'transitionend', (e) => {
            if (e.target === this.launcherDialog) {
              e.stopPropagation();
              return resolve(e);
            }
          })
        })
          .catch((e) => {
            log.error(e);
          });
      });
    }

    hideDialog() {
      removeCssClass(this.launcherDialog, 'onesignal-bell-launcher-dialog-opened');
      return new Promise((resolve, reject) => {
        once(this.launcherDialog, 'transitionend', (e) => {
          if (e.target === this.launcherDialog) {
            e.stopPropagation();
            return resolve(e);
          }
        })
      });
    }

    isDialogOpened() {
      return document.querySelector('.onesignal-bell-launcher-dialog-opened');
    }

    showLauncher() {
      addCssClass(this.launcher, 'onesignal-bell-launcher-active');
    }

    hideLauncher() {
      removeCssClass(this.launcher, 'onesignal-bell-launcher-active');
    }

    setMessage(message) {
      this.launcherMessageBody.innerHTML = message;
    }

    showMessage() {
      addCssClass(this.launcherMessage, 'onesignal-bell-launcher-message-opened');
      Event.trigger(Bell.EVENTS.MESSAGE_DISPLAYED);
    }

    hideMessage() {
      removeCssClass(this.launcherMessage, 'onesignal-bell-launcher-message-opened');
      return new Promise((resolve, reject) => {
        once(this.launcherMessage, 'transitionend', (e, destroyListenerFn) => {
          if (e.target === this.launcherMessage && e.propertyName === 'opacity') {
            destroyListenerFn();
            Event.trigger(Bell.EVENTS.MESSAGE_HIDDEN);
            return resolve(e);
          }
        }, true)
      });
    }

    isMessageOpened() {
      return document.querySelector('.onesignal-bell-launcher-message-opened');
    }

    displayMessage(content, hideAfter = 0) {
      return new Promise((resolve, reject) => {
        if (this.isMessageOpened()) {
          this.hideMessage()
            .then(() => {
              this.setMessage(content);
              this.showMessage();
              if (hideAfter) {
                setTimeout(() => {
                  this.hideMessage();
                  return resolve();
                }, hideAfter);
              } else {
                return resolve();
              }
            })
            .catch(function (e) {
              log.error(e);
            });
        } else {
          this.setMessage(content);
          this.showMessage();
          if (hideAfter) {
            setTimeout(() => {
              this.hideMessage();
              return resolve();
            }, hideAfter);
          } else {
            return resolve();
          }
        }
      });
    }

    setBadge(content) {
      this.launcherBadge.innerHTML = content;
    }

    showBadge() {
      if (this.badgeHasContent()) {
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-opened');
      }
    }

    isBadgeOpen() {
      return document.querySelector('.onesignal-bell-badge-opened');
    }

    badgeHasContent() {
      return this.launcherBadge.innerHTML.length > 0;
    }

    getBadgeContent() {
      return this.launcherBadge.innerHTML;
    }

    incrementBadge() {
      let content = this.getBadgeContent();
      // If it IS a number (is not not a number)
      if (!isNaN(content)) {
        let badgeNumber = +content; // Coerce to int
        badgeNumber += 1;
        this.setBadge(badgeNumber)
        return badgeNumber;
      }
    }

    decrementBadge() {
      let content = this.getBadgeContent();
      // If it IS a number (is not not a number)
      if (!isNaN(content)) {
        let badgeNumber = +content; // Coerce to int
        badgeNumber -= 1;
        if (badgeNumber > 0)
          this.setBadge(badgeNumber)
        else
          this.setBadge("");
        return badgeNumber;
      }
    }

    setInactive(isInactive) {
      if (isInactive) {
        this.hideMessage();
        if (this.badgeHasContent()) {
          return this.hideBadge()
            .then(() => {
              addCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
              this.setSize('small');
              ;
              var launcher = this.launcher;
              return new Promise((resolve, reject) => {
                // Once the launcher has finished shrinking down
                once(this.launcher, 'transitionend', (e) => {
                  if (e.target === this.launcher) {
                    e.stopPropagation();
                    return resolve(e);
                  }
                })
              });
            })
            .then(() => {
              this.showBadge();
            })
            .catch(function (e) {
              log.error(e);
            });
        }
        else {
          addCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
          this.setSize('small');
          var launcher = this.launcher;
          return new Promise((resolve, reject) => {
            // Once the launcher has finished shrinking down
            once(this.launcher, 'transitionend', (e) => {
              if (e.target === this.launcher) {
                e.stopPropagation();
                return resolve(e);
              }
            })
          });
        }
      }
      else {
        if (this.badgeHasContent()) {
          return this.hideBadge()
            .then(() => {
              removeCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
              this.setSize(this.options.size);
              var launcher = this.launcher;
              return new Promise((resolve, reject) => {
                // Once the launcher has finished shrinking down
                once(this.launcher, 'transitionend', (e) => {
                  if (e.target === this.launcher) {
                    e.stopPropagation();
                    return resolve(e);
                  }
                })
              });
            })
            .then(() => {
              this.showBadge();
            })
            .catch(function (e) {
              log.error(e);
            });
        } else {
          removeCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
          this.setSize(this.options.size);
          var launcher = this.launcher;
          return new Promise((resolve, reject) => {
            // Once the launcher has finished shrinking down
            once(this.launcher, 'transitionend', (e) => {
              if (e.target === this.launcher) {
                e.stopPropagation();
                return resolve(e);
              }
            })
          });
        }
      }
    }

    setSize(size) {
      removeCssClass(this.launcher, 'onesignal-bell-launcher-sm');
      removeCssClass(this.launcher, 'onesignal-bell-launcher-md');
      removeCssClass(this.launcher, 'onesignal-bell-launcher-lg');
      if (size === 'small') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-sm')
      }
      else if (size === 'medium') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-md')
      }
      else if (size === 'large') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-lg')
      }
      else {
        throw new Error('Invalid OneSignal bell size ' + size);
      }
    }

    get container() {
      return document.querySelector('#onesignal-bell-container');
    }

    get launcher() {
      if (!this._launcher)
        this._launcher = new DomElement('.onesignal-bell-launcher', null, 'onesignal-bell-launcher-inactive', 'shown');
      return this._launcher;
    }

    get button() {
      if (!this._button)
        this._button = new DomElement('.onesignal-bell-launcher-button', 'onesignal-bell-launcher-button-active', null, 'shown');
      return this._button;
    }

    get badge() {
      if (!this._badge)
        this._badge = new DomElement('.onesignal-bell-launcher-badge', 'onesignal-bell-launcher-badge-active', null, 'hidden');
      return this._badge;
    }

    get message() {
      if (!this._message)
        this._message = new DomElement('.onesignal-bell-launcher-message', 'onesignal-bell-launcher-message-opened', null, 'hidden', 'opacity', '.onesignal-bell-launcher-message-body');
      return this._message;
    }

    get dialog() {
      if (!this._dialog)
        this._dialog = new DomElement('.onesignal-bell-launcher-dialog', 'onesignal-bell-launcher-dialog-opened', null, 'hidden', 'opacity', '.onesignal-bell-launcher-dialog-body');
      return this._dialog;
    }
  }

  module.exports = Bell;
}