import { isPushNotificationsSupported, getConsoleStyle, addCssClass, removeCssClass, clearDomElementChildren, once, logError } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import AnimatedElement from './AnimatedElement.js';
import * as Browser from 'bowser';
import Bell from './bell.js';
import { HOST_URL } from '../vars.js';
import LimitStore from '../limitStore.js';


export default class Dialog extends AnimatedElement {

  constructor(bell) {
    super('.onesignal-bell-launcher-dialog', 'onesignal-bell-launcher-dialog-opened', null, 'hidden', ['opacity', 'transform'], '.onesignal-bell-launcher-dialog-body');

    this.bell = bell;
    this.subscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
    this.unsubscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';
    this.notificationIcons = null;

    OneSignal.on(Bell.EVENTS.STATE_CHANGED, (state) => {
      if (state.to === Bell.STATES.SUBSCRIBED) {
        if (this.notificationIcons === null) {
          this.getNotificationIcons().then((icons) => {
            this.notificationIcons = icons;
          });
        }
      }
    });

    window.addEventListener('click', (event) => {
      if (event.target === document.querySelector(this.subscribeButtonId))
        Event.trigger(Bell.EVENTS.SUBSCRIBE_CLICK);
      else if (event.target === document.querySelector(this.unsubscribeButtonId))
        Event.trigger(Bell.EVENTS.UNSUBSCRIBE_CLICK);
    });
  }

  getNotificationIcons() {
    return OneSignal.getAppId()
      .then(appId => {
        if (!appId) {
          return Promise.reject(null);
        } else {
          let url = `${OneSignal._API_URL}apps/${appId}/icon`;
          return url;
        }
      }, () => {
        log.debug('No app ID, not getting notification icon for notify button.');
        return;
      })
      .then(url => fetch(url))
      .then(response => response.json())
      .then(data => {
        if (data.errors) {
          log.error(`API call %c${url}`, getConsoleStyle('code'), 'failed with:', data.errors);
          reject(null);
        }
        return data;
      })
      .catch(function (ex) {
        log.error('Call %cgetNotificationIcons()', getConsoleStyle('code'), 'failed with:', ex);
      })
  }

  getPlatformNotificationIcon() {
    if (this.notificationIcons) {
      if (Browser.chrome || Browser.firefox) {
        return this.notificationIcons.chrome || this.notificationIcons.safari;
      }
      else if (Browser.safari) {
        return this.notificationIcons.safari || this.notificationIcons.chrome;
      }
    }
    else return null;
  }

  show() {
    return this.updateBellLauncherDialogBody()
      .then(() => super.show())
      .catch(e => logError(e));
  }

  get subscribeButtonSelectorId() {
    return 'subscribe-button';
  }

  get unsubscribeButtonSelectorId() {
    return 'unsubscribe-button';
  }

  get subscribeButton() {
    return this.element.querySelector('#' + this.subscribeButtonSelectorId);
  }

  get unsubscribeButton() {
    return this.element.querySelector('#' + this.unsubscribeButtonSelectorId);
  }

  updateBellLauncherDialogBody() {
    return OneSignal.getSubscription().then((currentSetSubscription) => {
      clearDomElementChildren(document.querySelector(this.nestedContentSelector));
      let contents = 'Nothing to show.';

      var footer = '';
      if (this.bell.options.showCredit) {
        footer = `<div class="divider"></div>
                  <div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`;
      }

      if (this.bell.state === Bell.STATES.SUBSCRIBED && currentSetSubscription === true ||
        this.bell.state === Bell.STATES.UNSUBSCRIBED && currentSetSubscription === false) {

        let notificationIconHtml = '';
        let imageUrl = this.getPlatformNotificationIcon();
        if (imageUrl) {
          notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`
        } else {
          notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`
        }

        let buttonHtml = '';
        if (this.bell.state !== Bell.STATES.SUBSCRIBED)
          buttonHtml = `<button type="button" class="action" id="${this.subscribeButtonSelectorId}">${this.bell.text['dialog.main.button.subscribe']}</button>`;
        else
          buttonHtml = `<button type="button" class="action" id="${this.unsubscribeButtonSelectorId}">${this.bell.text['dialog.main.button.unsubscribe']}</button>`;

        contents = `
                  <h1>${this.bell.text['dialog.main.title']}</h1>
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
                  ${footer}
                `;
      }
      else if (this.bell.state === Bell.STATES.BLOCKED) {
        let imageUrl = null;
        if (Browser.chrome) {
          if (!Browser.mobile && !Browser.tablet) {
            imageUrl = HOST_URL + '/bell/chrome-unblock.jpg';
          }
        }
        else if (Browser.firefox)
          imageUrl = HOST_URL + '/bell/firefox-unblock.jpg';
        else if (Browser.safari)
          imageUrl = HOST_URL + '/bell/safari-unblock.jpg';

        let instructionsHtml = '';
        if (imageUrl) {
          instructionsHtml = `

            <a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>
            `;
        }

        if ((Browser.mobile || Browser.tablet) && Browser.chrome) {
          instructionsHtml = `
            <ol>
            <li>Access <strong>Settings</strong> by tapping the three menu dots <strong>⋮</strong></li>
            <li>Click <strong>Site settings</strong> under Advanced.</li>
            <li>Click <strong>Notifications</strong>.</li>
            <li>Find and click this entry for this website.</li>
            <li>Click <strong>Notifications</strong> and set it to <strong>Allow</strong>.</li>
            </ol>
          `;
        }
        contents = `
                  <h1>${this.bell.text['dialog.blocked.title']}</h1>
                  <div class="divider"></div>
                  <div class="instructions">
                  <p>${this.bell.text['dialog.blocked.message']}</p>
                  ${instructionsHtml}
                  </div>
                  ${footer}
                `;
      }
      addDomElement(document.querySelector(this.nestedContentSelector), 'beforeend', contents);
      this.bell.setCustomColorsIfSpecified();
    });
  }
}