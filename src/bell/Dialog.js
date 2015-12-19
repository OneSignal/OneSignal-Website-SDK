import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, once } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import AnimatedElement from './AnimatedElement.js';
import bowser from 'bowser';
import Bell from './bell.js';


export default class Dialog extends AnimatedElement {

  constructor(bell) {
    super('.onesignal-bell-launcher-dialog', 'onesignal-bell-launcher-dialog-opened', null, 'hidden', 'opacity', '.onesignal-bell-launcher-dialog-body');

    this.bell = bell;
    this.subscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
    this.unsubscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';
    this.notificationIcons = null;

    window.addEventListener(Bell.EVENTS.STATE_CHANGED, (state) => {
      state = state.detail;
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
}