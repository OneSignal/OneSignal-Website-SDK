import bowser from 'bowser';

import Event from '../Event';
import SdkEnvironment from '../managers/SdkEnvironment';
import {addDomElement, clearDomElementChildren, getPlatformNotificationIcon} from '../utils';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';

export default class Dialog extends AnimatedElement {

  public bell: Bell;
  public subscribeButtonId: string;
  public unsubscribeButtonId: string;
  public notificationIcons: NotificationIcons | null;

  constructor(bell: Bell) {
    super('.onesignal-bell-launcher-dialog', 'onesignal-bell-launcher-dialog-opened', undefined, 'hidden',
         ['opacity', 'transform'], '.onesignal-bell-launcher-dialog-body');

    this.bell = bell;
    this.subscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
    this.unsubscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';
    this.notificationIcons = null;
  }

  show() {
    return this.updateBellLauncherDialogBody()
      .then(() => super.show());
  }

  get subscribeButtonSelectorId() {
    return 'subscribe-button';
  }

  get unsubscribeButtonSelectorId() {
    return 'unsubscribe-button';
  }

  get subscribeButton() {
    return this.element ? this.element.querySelector('#' + this.subscribeButtonSelectorId) : null;
  }

  get unsubscribeButton() {
    return this.element ? this.element.querySelector('#' + this.unsubscribeButtonSelectorId) : null;
  }

  updateBellLauncherDialogBody() {
    return OneSignal.getSubscription().then((currentSetSubscription: boolean) => {
      if (this.nestedContentSelector) {
        clearDomElementChildren(this.nestedContentSelector);
      }
      let contents = 'Nothing to show.';

      var footer = '';
      if (this.bell.options.showCredit) {
        footer = `<div class="divider"></div><div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`;
      }

      if (this.bell.state === Bell.STATES.SUBSCRIBED && currentSetSubscription === true ||
        this.bell.state === Bell.STATES.UNSUBSCRIBED && currentSetSubscription === false) {

        let notificationIconHtml = '';
        let imageUrl = getPlatformNotificationIcon(this.notificationIcons);
        if (imageUrl != 'default-icon') {
          notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`
        } else {
          notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`
        }

        let buttonHtml = '';
        if (this.bell.state !== Bell.STATES.SUBSCRIBED)
          buttonHtml = `<button type="button" class="action" id="${this.subscribeButtonSelectorId}">${this.bell.options.text['dialog.main.button.subscribe']}</button>`;
        else
          buttonHtml = `<button type="button" class="action" id="${this.unsubscribeButtonSelectorId}">${this.bell.options.text['dialog.main.button.unsubscribe']}</button>`;

        contents = `<h1>${this.bell.options.text['dialog.main.title']}</h1><div class="divider"></div><div class="push-notification">${notificationIconHtml}<div class="push-notification-text-container"><div class="push-notification-text push-notification-text-short"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div></div></div><div class="action-container">${buttonHtml}</div>${footer}`;
      }
      else if (this.bell.state === Bell.STATES.BLOCKED) {
        let imageUrl = null;
        if (bowser.chrome) {
          if (!bowser.mobile && !bowser.tablet)
            imageUrl = '/bell/chrome-unblock.jpg';
        }
        else if (bowser.firefox)
          imageUrl = '/bell/firefox-unblock.jpg';
        else if (bowser.safari)
          imageUrl = '/bell/safari-unblock.jpg';
        else if (bowser.msedge)
          imageUrl = '/bell/edge-unblock.png';

        let instructionsHtml = '';
        if (imageUrl) {
          imageUrl = SdkEnvironment.getOneSignalApiUrl().origin + imageUrl;
          instructionsHtml = `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>`;
        }

        if ((bowser.mobile || bowser.tablet) && bowser.chrome) {
          instructionsHtml = `<ol><li>Access <strong>Settings</strong> by tapping the three menu dots <strong>⋮</strong></li><li>Click <strong>Site settings</strong> under Advanced.</li><li>Click <strong>Notifications</strong>.</li><li>Find and click this entry for this website.</li><li>Click <strong>Notifications</strong> and set it to <strong>Allow</strong>.</li></ol>`;
        }
        contents = `<h1>${this.bell.options.text['dialog.blocked.title']}</h1><div class="divider"></div><div class="instructions"><p>${this.bell.options.text['dialog.blocked.message']}</p>${instructionsHtml}</div>${footer}`;
      }
      if (this.nestedContentSelector) {
        addDomElement(this.nestedContentSelector, 'beforeend', contents);
      }
      if (this.subscribeButton) {
        this.subscribeButton.addEventListener('click', () => {
          /*
            The welcome notification should only be shown if the user is
            subscribing for the first time and resubscribing via the notify
            button.

            If permission is already granted, __doNotShowWelcomeNotification is
            set to true to prevent showing a notification, but we actually want
            a notification shown in this resubscription case.
           */
          OneSignal.__doNotShowWelcomeNotification = false;
          Event.trigger(Bell.EVENTS.SUBSCRIBE_CLICK);
        });
      }
      if (this.unsubscribeButton) {
        this.unsubscribeButton.addEventListener('click', () => Event.trigger(Bell.EVENTS.UNSUBSCRIBE_CLICK));
      }
      this.bell.setCustomColorsIfSpecified();
    });
  }
}
