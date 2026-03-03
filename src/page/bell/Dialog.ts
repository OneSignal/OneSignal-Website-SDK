import { addDomElement, clearDomElementChildren, waitForAnimations } from 'src/shared/helpers/dom';
import type { NotificationIcons } from 'src/shared/notifications/types';
import { Browser } from 'src/shared/useragent/constants';
import {
  getBrowserName,
  isMobileBrowser,
  isTabletBrowser,
} from 'src/shared/useragent/detect';
import { getPlatformNotificationIcon } from 'src/shared/utils/utils';
import type Bell from './Bell';
import { BellState } from './constants';

const STATIC_RESOURCES_URL = 'https://media.onesignal.com/web-sdk';

const SUBSCRIBE_BUTTON_ID = 'subscribe-button';
const UNSUBSCRIBE_BUTTON_ID = 'unsubscribe-button';

const UNBLOCK_IMAGES: Partial<Record<string, string>> = {
  [Browser._Chrome]: '/bell/chrome-unblock.jpg',
  [Browser._Firefox]: '/bell/firefox-unblock.jpg',
  [Browser._Safari]: '/bell/safari-unblock.jpg',
  [Browser._Edge]: '/bell/edge-unblock.png',
};

export default class Dialog {
  public _bell: Bell;
  public _notificationIcons: NotificationIcons | null = null;
  public _selector = '.onesignal-bell-launcher-dialog';

  constructor(bell: Bell) {
    this._bell = bell;
  }

  get _element(): HTMLElement | null {
    return document.querySelector(this._selector);
  }

  get _shown(): boolean {
    return this._element?.classList.contains('onesignal-bell-launcher-dialog-opened') ?? false;
  }

  get _subscribeButton() {
    return this._element?.querySelector<HTMLButtonElement>(
      `#${SUBSCRIBE_BUTTON_ID}`,
    ) ?? null;
  }

  get _unsubscribeButton() {
    return this._element?.querySelector<HTMLButtonElement>(
      `#${UNSUBSCRIBE_BUTTON_ID}`,
    ) ?? null;
  }

  async _show() {
    await this._updateBellLauncherDialogBody();
    const el = this._element;
    if (!el || this._shown) return;
    el.classList.add('onesignal-bell-launcher-dialog-opened');
    await waitForAnimations(el);
  }

  async _hide() {
    const el = this._element;
    if (!el || !this._shown) return;
    el.classList.remove('onesignal-bell-launcher-dialog-opened');
    await waitForAnimations(el);
  }

  private async _updateBellLauncherDialogBody() {
    const isEnabled =
      await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();

    const bodySelector = '.onesignal-bell-launcher-dialog-body';
    clearDomElementChildren(bodySelector);

    const text = this._bell._options.text;
    const footer = this._bell._options.showCredit
      ? `<div class="divider"></div><div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`
      : '';

    let contents = 'Nothing to show.';
    const state = this._bell._state;
    const stateMatchesSubscription =
      (state === BellState._Subscribed && isEnabled) ||
      (state === BellState._Unsubscribed && !isEnabled);

    if (stateMatchesSubscription) {
      contents = this._buildSubscriptionContent(text, footer);
    } else if (state === BellState._Blocked) {
      contents = this._buildBlockedContent(text, footer);
    }

    addDomElement(bodySelector, 'beforeend', contents);

    this._subscribeButton?.addEventListener('click', () => {
      OneSignal._doNotShowWelcomeNotification = false;
      this._bell._onSubscribeClick();
    });
    this._unsubscribeButton?.addEventListener('click', () =>
      this._bell._onUnsubscribeClick(),
    );

    this._bell._setCustomColorsIfSpecified();
  }

  private _buildSubscriptionContent(
    text: Bell['_options']['text'],
    footer: string,
  ): string {
    const imageUrl = getPlatformNotificationIcon(this._notificationIcons);
    const iconHtml =
      imageUrl !== 'default-icon'
        ? `<div class="push-notification-icon"><img src="${imageUrl}"></div>`
        : `<div class="push-notification-icon push-notification-icon-default"></div>`;

    const isSubscribed = this._bell._state === BellState._Subscribed;
    const buttonId = isSubscribed ? UNSUBSCRIBE_BUTTON_ID : SUBSCRIBE_BUTTON_ID;
    const buttonText = isSubscribed
      ? text['dialog.main.button.unsubscribe']
      : text['dialog.main.button.subscribe'];

    return `<h1>${text['dialog.main.title']}</h1><div class="divider"></div><div class="push-notification">${iconHtml}<div class="push-notification-text-container"><div class="push-notification-text push-notification-text-short"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div></div></div><div class="action-container"><button type="button" class="action" id="${buttonId}">${buttonText}</button></div>${footer}`;
  }

  private _buildBlockedContent(
    text: Bell['_options']['text'],
    footer: string,
  ): string {
    const browserName = getBrowserName();
    const isMobileOrTablet = isMobileBrowser() || isTabletBrowser();

    let instructionsHtml = '';
    if (isMobileOrTablet && browserName === Browser._Chrome) {
      instructionsHtml = `<ol><li>Access <strong>Settings</strong> by tapping the three menu dots <strong>⋮</strong></li><li>Click <strong>Site settings</strong> under Advanced.</li><li>Click <strong>Notifications</strong>.</li><li>Find and click this entry for this website.</li><li>Click <strong>Notifications</strong> and set it to <strong>Allow</strong>.</li></ol>`;
    } else {
      const imagePath =
        browserName === Browser._Chrome && isMobileOrTablet
          ? undefined
          : UNBLOCK_IMAGES[browserName];
      if (imagePath) {
        const imageUrl = STATIC_RESOURCES_URL + imagePath;
        instructionsHtml = `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>`;
      }
    }

    return `<h1>${text['dialog.blocked.title']}</h1><div class="divider"></div><div class="instructions"><p>${text['dialog.blocked.message']}</p>${instructionsHtml}</div>${footer}`;
  }
}
