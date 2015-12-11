import { isBrowserEnv, isPushNotificationsSupported, removeDomElement, addDomElement, addCssClass, removeCssClass, once, on, off } from './utils.js';
import LimitStore from './limitStore.js';
import log from 'loglevel';
import { triggerEvent } from './events.js'

if (isBrowserEnv()) {
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
    constructor({
        size = 'small',
        position = 'bottom-left',
        theme = 'red-white',
        showLauncherAfter = 10,
        showBadgeAfter = 300,
        messages = {
            'unsubscribed': 'Subscribe to notifications',
            'subscribed': "You're subscribed to notifications"
          }
      } = {}) {
      this.options = {
        size: size,
        position: position,
        theme: theme,
        showLauncherAfter: showLauncherAfter,
        showBadgeAfter: showBadgeAfter,
        messages: messages
      };
      this.size = this.options.size;
      this.position = this.options.position;
      this.messages = this.options.messages;
      if (!this.messages.unsubscribed) {
        this.messages.unsubscribed = 'Subscribe to notifications'
      }
      if (!this.messages.subscribed) {
        this.messages.subscribed = "You're subscribed to notifications"
      }
      this.states = {
        'uninitialized': 'The bell is loading.',
        'subscribed': 'The user is subscribed',
        'unsubscribed': 'The user is unsubscribed'
      };
      this.state = 'uninitialized';

      // Install event hooks
      window.addEventListener('onesignal.bell.state.changed', (state) => {
        console.info('onesignal.bell.state.changed', state.detail);
      });

      window.addEventListener('onesignal.subscription.changed', (e) => {
        this.setState(e.detail ? 'subscribed' : 'unsubscribed');
      });

      this.updateState();
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

      // Install events
      this.launcherButton.addEventListener('mouseover', () => {
        addCssClass(this.launcherButton, 'onesignal-bell-launcher-button-hover');
        this.showMessage();
        addCssClass(this.launcherMessage, 'onesignal-bell-launcher-message-opened');
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-hover');
      });

      this.launcherButton.addEventListener('mouseleave', () => {
        removeCssClass(this.launcherButton, 'onesignal-bell-launcher-button-hover');
        this.hideMessage();
        removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-hover');
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

      this.launcherBadge.addEventListener('mouseover', () => {
        addCssClass(this.launcherButton, 'onesignal-bell-launcher-button-hover');
        this.showMessage();
        addCssClass(this.launcherMessage, 'onesignal-bell-launcher-message-opened');
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-hover');
      });

      this.launcherBadge.addEventListener('mouseleave', () => {
        removeCssClass(this.launcherButton, 'onesignal-bell-launcher-button-hover');
        this.hideMessage();
        removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-hover');
      });

      this.launcherBadge.addEventListener('mousedown', () => {
        addCssClass(this.launcherButton, 'onesignal-bell-launcher-button-active');
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-active');
      });

      this.launcherBadge.addEventListener('mouseup', () => {
        removeCssClass(this.launcherButton, 'onesignal-bell-launcher-button-active');
        removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-active');
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

      this._scheduleEvent(this.options.showLauncherAfter, () => {
        log.info('Shown');
        this.showLauncher();
      })
        .then(() => {
          return this._scheduleEvent(this.options.showBadgeAfter, () => {
            this.showBadge();
          });
        })
        .catch((e) => {
          log.error(e);
        });
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
        this.setState(isEnabled ? 'subscribed' : 'unsubscribed');
      });
    }

    /**
     * Updates the current state to the specified new state.
     * @param newState One of ['subscribed', 'unsubscribed'].
     */
    setState(newState) {
      if (this.states.hasOwnProperty(newState)) {
        let lastState = this.state;
        this.state = newState;
        if (lastState !== newState) {
          triggerEvent('onesignal.bell.state.changed', {from: lastState, to: newState });

          // Update anything that should be changed here in the new state
          this.setMessage(this.messages[newState]);
        }
      }
      else {
        log.error('Cannot update to invalid new state', newState);
      }
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
    }

    hideMessage() {
      removeCssClass(this.launcherMessage, 'onesignal-bell-launcher-message-opened');
    }

    setBadge(content) {
      this.launcherBadge.innerHTML = content;
    }

    showBadge() {
      if (this.badgeHasContent()) {
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-opened');
      }
    }

    badgeHasContent() {
      return this.launcherBadge.innerHTML.length > 0;
    }

    hideBadge() {
      return new Promise((resolve, reject) => {
        removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-opened');
        once(this.launcherBadge, 'transitionend', function (e) {
          return resolve(e);
        })
      })
      .catch(function (e) {
          log.error(e);
          reject(e);
      });
    }

    setInactive(isInactive) {
      if (isInactive) {
        if (this.badgeHasContent()) {
          this.hideBadge()
            .then(() => {
              addCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
              this.setSize('small');
              var launcher = this.launcher;
              return new Promise((resolve, reject) => {
                // Once the launcher has finished shrinking down
                once(this.launcher, 'transitionend', (e) => {
                  if (e.target === this.launcher && e.propertyName === 'opacity') {
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
        }
      }
      else {
        if (this.badgeHasContent()) {
          this.hideBadge()
            .then(() => {
              removeCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
              this.setSize(this.options.size);
              var launcher = this.launcher;
              return new Promise((resolve, reject) => {
                // Once the launcher has finished shrinking down
                once(this.launcher, 'transitionend', (e) => {
                  if (e.target === this.launcher && e.propertyName === 'opacity') {
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
      return this.container.querySelector('#onesignal-bell-launcher');
    }

    get launcherButton() {
      return this.launcher.querySelector('.onesignal-bell-launcher-button');
    }

    get launcherBadge() {
      return this.launcher.querySelector('.onesignal-bell-launcher-badge');
    }

    get launcherMessage() {
      return this.launcher.querySelector('.onesignal-bell-launcher-message');
    }

    get launcherMessageBody() {
      return this.launcher.querySelector('.onesignal-bell-launcher-message-body');
    }
  }

  module.exports = Bell;
}