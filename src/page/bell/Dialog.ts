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

const SUBSCRIBE_BUTTON_SELECTOR_ID = 'subscribe-button';
const UNSUBSCRIBE_BUTTON_SELECTOR_ID = 'unsubscribe-button';

export default class Dialog extends AnimatedElement {
  public _bell: Bell;
  public _notificationIcons: NotificationIcons | null;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-dialog',
      'onesignal-bell-launcher-dialog-opened',
      undefined,
      undefined,
      '.onesignal-bell-launcher-dialog-body',
    );

    this._bell = bell;
    this._notificationIcons = null;
  }

  _show() {
    return this._updateBellLauncherDialogBody().then(() => super._show());
  }

  get _subscribeButton() {
    return this._element
      ? this._element.querySelector<HTMLButtonElement>(
          '#' + SUBSCRIBE_BUTTON_SELECTOR_ID,
        )
      : null;
  }

  get _unsubscribeButton() {
    return this._element
      ? this._element.querySelector<HTMLButtonElement>(
          '#' + UNSUBSCRIBE_BUTTON_SELECTOR_ID,
        )
      : null;
  }

  _updateBellLauncherDialogBody() {
    return OneSignal._context._subscriptionManager
      ._isPushNotificationsEnabled()
      .then((currentSetSubscription: boolean) => {
        if (this._nestedContentSelector) {
          clearDomElementChildren(this._nestedContentSelector);
        }
        let contents = 'Nothing to show.';

        let footer = '';
        if (this._bell._options.showCredit) {
          footer = `<div class="divider"></div><div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`;
        }

        if (
          (this._bell._state === BellState._Subscribed &&
            currentSetSubscription === true) ||
          (this._bell._state === BellState._Unsubscribed &&
            currentSetSubscription === false)
        ) {
          let notificationIconHtml = '';
          const imageUrl = getPlatformNotificationIcon(this._notificationIcons);
          if (imageUrl != 'default-icon') {
            notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`;
          } else {
            notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`;
          }

          let buttonHtml = '';
          if (this._bell._state !== BellState._Subscribed)
            buttonHtml = `<button type="button" class="action" id="${SUBSCRIBE_BUTTON_SELECTOR_ID}">${this._bell._options.text['dialog.main.button.subscribe']}</button>`;
          else
            buttonHtml = `<button type="button" class="action" id="${UNSUBSCRIBE_BUTTON_SELECTOR_ID}">${this._bell._options.text['dialog.main.button.unsubscribe']}</button>`;

          contents = `<h1>${this._bell._options.text['dialog.main.title']}</h1><div class="divider"></div><div class="push-notification">${notificationIconHtml}<div class="push-notification-text-container"><div class="push-notification-text push-notification-text-short"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div></div></div><div class="action-container">${buttonHtml}</div>${footer}`;
        } else if (this._bell._state === BellState._Blocked) {
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
          contents = `<h1>${this._bell._options.text['dialog.blocked.title']}</h1><div class="divider"></div><div class="instructions"><p>${this._bell._options.text['dialog.blocked.message']}</p>${instructionsHtml}</div>${footer}`;
        }
        if (this._nestedContentSelector) {
          addDomElement(this._nestedContentSelector, 'beforeend', contents);
        }
        if (this._subscribeButton) {
          this._subscribeButton.addEventListener('click', () => {
            /*
              The welcome notification should only be shown if the user is
              subscribing for the first time and resubscribing via the notify
              button.

              If permission is already granted, __doNotShowWelcomeNotification is
              set to true to prevent showing a notification, but we actually want
              a notification shown in this resubscription case.
            */
            OneSignal._doNotShowWelcomeNotification = false;
            OneSignalEvent._trigger(BellEvent._SubscribeClick);
          });
        }
        if (this._unsubscribeButton) {
          this._unsubscribeButton.addEventListener('click', () =>
            OneSignalEvent._trigger(BellEvent._UnsubscribeClick),
          );
        }
        this._bell._setCustomColorsIfSpecified();
      });
  }
}
