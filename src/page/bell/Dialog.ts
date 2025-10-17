import { addDomElement, clearDomElementChildren } from 'src/shared/helpers/dom';
import type { NotificationIcons } from 'src/shared/notifications/types';
import { Browser } from 'src/shared/useragent/constants';
import {
  getBrowserName,
  isMobileBrowser,
  isTabletBrowser,
} from 'src/shared/useragent/detect';
import { getPlatformNotificationIcon } from 'src/shared/utils/utils';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import AnimatedElement from './AnimatedElement';
import type Bell from './Bell';
import { BellEvent, BellState } from './constants';

const STATIC_RESOURCES_URL = new URL('https://media.onesignal.com/web-sdk');

export default class Dialog extends AnimatedElement {
  public bell: Bell;
  public subscribeButtonId: string;
  public unsubscribeButtonId: string;
  public notificationIcons: NotificationIcons | null;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-dialog',
      'onesignal-bell-launcher-dialog-opened',
      undefined,
      undefined,
      '.onesignal-bell-launcher-dialog-body',
    );

    this.bell = bell;
    this.subscribeButtonId =
      '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
    this.unsubscribeButtonId =
      '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';
    this.notificationIcons = null;
  }

  show() {
    return this.updateBellLauncherDialogBody().then(() => super.show());
  }

  get subscribeButtonSelectorId() {
    return 'subscribe-button';
  }

  get unsubscribeButtonSelectorId() {
    return 'unsubscribe-button';
  }

  get subscribeButton() {
    return this.element
      ? this.element.querySelector<HTMLButtonElement>(
          '#' + this.subscribeButtonSelectorId,
        )
      : null;
  }

  get unsubscribeButton() {
    return this.element
      ? this.element.querySelector<HTMLButtonElement>(
          '#' + this.unsubscribeButtonSelectorId,
        )
      : null;
  }

  updateBellLauncherDialogBody() {
    return OneSignal._context._subscriptionManager
      .isPushNotificationsEnabled()
      .then((currentSetSubscription: boolean) => {
        if (this.nestedContentSelector) {
          clearDomElementChildren(this.nestedContentSelector);
        }
        let contents = 'Nothing to show.';

        let footer = '';
        if (this.bell.options.showCredit) {
          footer = `<div class="divider"></div><div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`;
        }

        if (
          (this.bell.state === BellState._Subscribed &&
            currentSetSubscription === true) ||
          (this.bell.state === BellState._Unsubscribed &&
            currentSetSubscription === false)
        ) {
          let notificationIconHtml = '';
          const imageUrl = getPlatformNotificationIcon(this.notificationIcons);
          if (imageUrl != 'default-icon') {
            notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`;
          } else {
            notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`;
          }

          let buttonHtml = '';
          if (this.bell.state !== BellState._Subscribed)
            buttonHtml = `<button type="button" class="action" id="${this.subscribeButtonSelectorId}">${this.bell.options.text['dialog.main.button.subscribe']}</button>`;
          else
            buttonHtml = `<button type="button" class="action" id="${this.unsubscribeButtonSelectorId}">${this.bell.options.text['dialog.main.button.unsubscribe']}</button>`;

          contents = `<h1>${this.bell.options.text['dialog.main.title']}</h1><div class="divider"></div><div class="push-notification">${notificationIconHtml}<div class="push-notification-text-container"><div class="push-notification-text push-notification-text-short"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div></div></div><div class="action-container">${buttonHtml}</div>${footer}`;
        } else if (this.bell.state === BellState._Blocked) {
          let imageUrl = null;

          const browserName = getBrowserName();
          if (browserName === Browser.Chrome) {
            if (!isMobileBrowser() && !isTabletBrowser())
              imageUrl = '/bell/chrome-unblock.jpg';
          } else if (browserName === Browser.Firefox)
            imageUrl = '/bell/firefox-unblock.jpg';
          else if (browserName === Browser.Safari)
            imageUrl = '/bell/safari-unblock.jpg';
          else if (browserName === Browser.Edge)
            imageUrl = '/bell/edge-unblock.png';

          let instructionsHtml = '';
          if (imageUrl) {
            imageUrl = STATIC_RESOURCES_URL + imageUrl;
            instructionsHtml = `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>`;
          }

          if (
            (isMobileBrowser() || isTabletBrowser()) &&
            browserName === Browser.Chrome
          ) {
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
            OneSignal._doNotShowWelcomeNotification = false;
            OneSignalEvent.trigger(BellEvent._SubscribeClick);
          });
        }
        if (this.unsubscribeButton) {
          this.unsubscribeButton.addEventListener('click', () =>
            OneSignalEvent.trigger(BellEvent._UnsubscribeClick),
          );
        }
        this.bell.setCustomColorsIfSpecified();
      });
  }
}
