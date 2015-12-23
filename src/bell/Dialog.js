import { isPushNotificationsSupported, isBrowserSafari, isSupportedFireFox, isBrowserFirefox, getFirefoxVersion, isSupportedSafari, getConsoleStyle, addCssClass, removeCssClass, clearDomElementChildren, once } from '../utils.js';
import log from 'loglevel';
import Event from '../events.js';
import AnimatedElement from './AnimatedElement.js';
import * as Browser from 'bowser';
import Bell from './bell.js';
import LimitStore from '../limitStore.js';


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
      .catch(e => log.error(e));
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
    return new Promise((resolve, reject) => {
      clearDomElementChildren(document.querySelector(this.nestedContentSelector));

      let currentSetSubscription = LimitStore.getLast('setsubscription.value');
      let contents = 'Nothing to show.';

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
                  <div class="divider"></div>
                  <div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>
                `;
      }
      else if (this.bell.state === Bell.STATES.BLOCKED) {
        let imageUrl = null;
        if (Browser.chrome)
          imageUrl = HOST_URL + '/bell/chrome-unblock.jpg';
        else if (Browser.firefox)
          imageUrl = HOST_URL + '/bell/firefox-unblock.jpg';
        else if (Browser.safari)
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
                  <h1>${this.bell.text['dialog.blocked.title']}</h1>
                  <div class="divider"></div>
                  <div class="instructions">
                  <p>${this.bell.text['dialog.blocked.message']}</p>
                  ${instructionsHtml}
                  </div>
                  <div class="divider"></div>
                  <div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>
                `;
      }

      addDomElement(document.querySelector(this.nestedContentSelector), 'beforeend', contents);
      resolve();
    }).catch(e => log.error(e));
  }
}