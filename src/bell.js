import { isBrowserEnv, isPushNotificationsSupported, removeDomElement, addDomElement, addCssClass, removeCssClass } from './utils.js';
import LimitStore from './limitStore.js';
import log from 'loglevel';

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
        showLauncherAfter = 750,
        showBadgeAfter = 300,
      } = {}) {
      this.options = {
        size: size,
        position: position,
        theme: theme,
        showLauncherAfter: showLauncherAfter,
        showBadgeAfter: showBadgeAfter
      };
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
      addDomElement('body', 'beforeend', '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-bell-reset"></div>');
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
        addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-hover');
      });

      this.launcherBadge.addEventListener('mouseleave', () => {
        removeCssClass(this.launcherButton, 'onesignal-bell-launcher-button-hover');
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
      if (this.options.size === 'small') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-sm')
      }
      else if (this.options.size === 'medium') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-md')
      }
      else if (this.options.size === 'large') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-lg')
      }

      if (this.options.position === 'bottom-left') {
        addCssClass(this.container, 'onesignal-bell-container-bottom-left')
        addCssClass(this.launcher, 'onesignal-bell-launcher-bottom-left')
      }
      else if (this.options.position === 'bottom-right') {
        addCssClass(this.container, 'onesignal-bell-container-bottom-right')
        addCssClass(this.launcher, 'onesignal-bell-launcher-bottom-right')
      }

      if (this.options.theme === 'white-on-red') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-theme-whiteonred')
      }
      else if (this.options.theme === 'red-on-white') {
        addCssClass(this.launcher, 'onesignal-bell-launcher-theme-redonwhite')
      }


      var durationSinceNavigation = new Date().getTime() - performance.timing.navigationStart;
      if (durationSinceNavigation > this.options.showLauncherAfter)
        this.showLauncher();
      else {
        this._scheduleEvent(Math.max(this.options.showLauncherAfter - durationSinceNavigation, 0), () => {
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
      addCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-opened');
    }

    hideBadge() {
      removeCssClass(this.launcherBadge, 'onesignal-bell-launcher-badge-opened');
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