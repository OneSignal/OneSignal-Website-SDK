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
          },
        prenotify = true
      } = {}) {
      this.options = {
        size: size,
        position: position,
        theme: theme,
        showLauncherAfter: showLauncherAfter,
        showBadgeAfter: showBadgeAfter,
        messages: messages,
        prenotify: prenotify
      };
      this.size = this.options.size;
      this.position = this.options.position;
      this.messages = this.options.messages;
      this.messages.queued = [];
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

      window.addEventListener('onesignal.bell.click', () => {
        this.hideMessage();
        if (this.state === 'unsubscribed') {
          OneSignal.registerForPushNotifications();
        } else {
          this.showDialog()
            .then((e) => {
              var self = this;
              once(document, 'click', (e) => {
                let wasDialogClicked = self.launcherDialog.contains(e.target);
                if (wasDialogClicked) {
                } else {
                  self.hideDialog()
                  .then((e) =>
                  {
                    if (this.wasInactive) {
                      this.setInactive(true);
                      this.wasInactive = undefined;
                    }
                  })
                  .catch((e) => {
                      log.error(e);
                    });
                }
              });
            })
            .catch((e) => {
              log.error(e);
            });
        }
      });

      window.addEventListener('onesignal.bell.hovering', () => {
        if (this.isInactive()) {
          this.wasInactive = true;
          this.setInactive(false);
        }
        // If there's already a message being force shown, do not override
        if (this.isMessageOpened() || this.isDialogOpened()) {
          console.debug('There is already a message being displayed; wait until it is hidden again.');
          return;
        }
        if (messages.queued.length > 0) {
          let dequeuedMessage = this.dequeueMessage();
          this.setMessage(dequeuedMessage);
        } else {
          this.setMessage(this.messages[this.state]);
        }
        this.showMessage();
      });

      window.addEventListener('onesignal.bell.hovered', () => {
        if (this.isMessageOpened()) {
          this.hideMessage()
            .then(() => {
              console.trace('Inside hovered.');
              this.setMessage(this.messages[this.state]);
              if (this.wasInactive && !this.isDialogOpened()) {
                this.setInactive(true);
                this.wasInactive = undefined;
              }
            });
        }
      });

      window.addEventListener('onesignal.subscription.changed', (e) => {
        this.setState(e.detail ? 'subscribed' : 'unsubscribed');
      });

      window.addEventListener('onesignal.actions.welcomenotificationsent', (e) => {
        this.displayMessage("Thanks for subscribing!", 2500)
        .then(() => {
            this.setInactive(true);
          })
        .catch((e) => {
            log.error(e);
          });
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
      // Insert the bell launcher dialog
      addDomElement(this.launcher, 'beforeend', '<div class="onesignal-bell-launcher-dialog"></div>');
      addDomElement(this.launcherDialog, 'beforeend', '<div class="onesignal-bell-launcher-dialog-body"></div>');

      addDomElement(this.launcherDialogBody, 'beforeend',
        `
        <h1>Manage Site Notifications</h1>
        <div class="push-notification">
          <div class="push-notification-icon"></div>
          <div class="push-notification-text-container">
            <div class="push-notification-text-short"></div>
            <div class="push-notification-text"></div>
            <div class="push-notification-text"></div>
          </div>
        </div>
        <div class="action-container">
          <button type="button" id="action-button">Unsubscribe</button>
        </div>
        <div class="divider"></div>
        <div class="kickback">Powered by OneSignal</div>
        `
      );

      // Install events
      this.launcherButton.addEventListener('mouseover', () => {
        var isHoveringData = LimitStore.get('bell.launcherButton.mouse', 'over');
        if (isHoveringData === undefined || isHoveringData[isHoveringData.length - 1] === 'out') {
          triggerEvent('onesignal.bell.hovering');
        }
        LimitStore.put('bell.launcherButton.mouse', 'over');
      });

      this.launcherButton.addEventListener('mouseleave', () => {
        LimitStore.put('bell.launcherButton.mouse', 'out');
        triggerEvent('onesignal.bell.hovered');
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
        triggerEvent('onesignal.bell.button.click');
        triggerEvent('onesignal.bell.click');
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
          console.log('isPushEnabled', isPushEnabled);
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
                if (this.options.prenotify) {
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
          triggerEvent('onesignal.bell.state.changed', {from: lastState, to: newState});
          // Update anything that should be changed here in the new state
        }

        // Update anything that should be reset to the same state
        this.setMessage(this.messages[newState]);
      }
      else {
        log.error('Cannot update to invalid new state', newState);
      }
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
      addCssClass(this.launcherDialog, 'onesignal-bell-launcher-dialog-opened');
      return new Promise((resolve, reject) => {
        once(this.launcherDialog, 'transitionend', (e) => {
          if (e.target === this.launcherDialog) {
            e.stopPropagation();
            return resolve(e);
          }
        })
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
    }

    hideMessage() {
      removeCssClass(this.launcherMessage, 'onesignal-bell-launcher-message-opened');
      return new Promise((resolve, reject) => {
        once(this.launcherMessage, 'transitionend', (e) => {
          if (e.target === this.launcherMessage) {
            e.stopPropagation();
            return resolve(e);
          }
        })
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
        this.setBadge(badgeNumber)
        return badgeNumber;
      }
    }

    hideBadge() {
      return new Promise((resolve, reject) => {
        removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-opened');
        once(this.launcherBadge, 'transitionend', (e) => {
          if (e.target === this.launcherBadge) {
            e.stopPropagation();
            return resolve(e);
          }
        })
      })
      .catch(function (e) {
          log.error(e);
          reject(e);
      });
    }

    isInactive() {
      return document.querySelector('.onesignal-bell-launcher-inactive');
    }

    setInactive(isInactive) {
      if (isInactive) {
        this.hideMessage();
        if (this.badgeHasContent()) {
          return this.hideBadge()
            .then(() => {
              addCssClass(this.launcher, 'onesignal-bell-launcher-inactive');
              this.setSize('small');;
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

    get launcherDialog() {
      return this.launcher.querySelector('.onesignal-bell-launcher-dialog');
    }

    get launcherDialogBody() {
      return this.launcher.querySelector('.onesignal-bell-launcher-dialog-body');
    }
  }

  module.exports = Bell;
}