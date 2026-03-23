import type { AppUserConfigNotifyButton } from 'src/shared/config/types';
import {
  addCssClass,
  addDomElement,
  decodeHtmlEntities,
  removeDomElement,
} from 'src/shared/helpers/dom';
import { delay } from 'src/shared/helpers/general';
import type { BellPosition, BellSize, BellText } from 'src/shared/prompts/types';

import { wasPromptOfTypeDismissed } from '../../shared/helpers/dismiss';
import { getNotificationIcons } from '../../shared/helpers/main';
import Log from '../../shared/libraries/Log';
import { DismissPrompt } from '../models/Dismiss';
import type { SubscriptionChangeEvent } from '../models/SubscriptionChangeEvent';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import Badge from './Badge';
import Button from './Button';
import { BellState, type BellStateValue, MESSAGE_TIMEOUT, MessageType } from './constants';
import Dialog from './Dialog';
import Launcher from './Launcher';
import Message from './Message';

const logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;

const DEFAULT_SIZE: BellSize = 'medium';
const DEFAULT_POSITION: BellPosition = 'bottom-right';
const DEFAULT_THEME = 'default';

const VALID_SIZES: readonly string[] = ['small', 'medium', 'large'];
const VALID_POSITIONS: readonly string[] = ['bottom-left', 'bottom-right'];
const VALID_THEMES: readonly string[] = ['default', 'inverse'];

const DEFAULT_TEXT: BellText = {
  'tip.state.unsubscribed': 'Subscribe to notifications',
  'tip.state.subscribed': "You're subscribed to notifications",
  'tip.state.blocked': "You've blocked notifications",
  'message.prenotify': 'Click to subscribe to notifications',
  'message.action.subscribed': 'Thanks for subscribing!',
  'message.action.resubscribed': "You're subscribed to notifications",
  'message.action.subscribing':
    'Click <strong>{{prompt.native.grant}}</strong> to receive notifications',
  'message.action.unsubscribed': "You won't receive notifications again",
  'dialog.main.title': 'Manage Site Notifications',
  'dialog.main.button.subscribe': 'SUBSCRIBE',
  'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
  'dialog.blocked.title': 'Unblock Notifications',
  'dialog.blocked.message': 'Follow these instructions to allow notifications:',
};

export default class Bell {
  public _options: AppUserConfigNotifyButton;
  public _state: BellStateValue = BellState._Uninitialized;
  public _ignoreSubscriptionState = false;
  public _actionInProgress = false;
  public _initialized = false;
  public _launcherEl: Launcher | undefined;
  public _buttonEl: Button | undefined;
  public _badgeEl: Badge | undefined;
  public _messageEl: Message | undefined;
  public _dialogEl: Dialog | undefined;

  constructor(config: Partial<AppUserConfigNotifyButton>, launcher?: Launcher) {
    this._options = {
      enable: config.enable || false,
      size: config.size || DEFAULT_SIZE,
      position: config.position || DEFAULT_POSITION,
      theme: config.theme || DEFAULT_THEME,
      showLauncherAfter: config.showLauncherAfter || 10,
      showBadgeAfter: config.showBadgeAfter || 300,
      text: { ...DEFAULT_TEXT, ...config.text },
      prenotify: config.prenotify,
      showCredit: config.showCredit,
      colors: config.colors,
      offset: config.offset,
    };

    if (launcher) {
      this._launcherEl = launcher;
    }

    if (!this._options.enable) return;

    this._validateOptions(this._options);
    this._installEventHooks();
  }

  private _validateOptions(options: AppUserConfigNotifyButton) {
    const assertChoice = (val: string | undefined, valid: readonly string[], label: string) => {
      if (!val || !valid.includes(val))
        throw new Error(`Invalid ${label} '${val}'. Choose: ${valid.join(', ')}`);
    };
    const assertAboveZero = (val: number | undefined, label: string) => {
      if (!val || val < 0) throw new Error(`Invalid ${label}. Must be above 0.`);
    };

    assertChoice(options.size, VALID_SIZES, 'size');
    assertChoice(options.position, VALID_POSITIONS, 'position');
    assertChoice(options.theme, VALID_THEMES, 'theme');
    assertAboveZero(options.showLauncherAfter, 'showLauncherAfter');
    assertAboveZero(options.showBadgeAfter, 'showBadgeAfter');
  }

  private _installEventHooks() {
    OneSignal._emitter.on(
      OneSignal.EVENTS.SUBSCRIPTION_CHANGED,
      async (isSubscribed: SubscriptionChangeEvent) => {
        if (isSubscribed.current.optedIn) {
          if (this._badge._shown && this._options.prenotify) {
            this._badge._hide();
          }
          if (this._dialog._notificationIcons === null) {
            this._dialog._notificationIcons = await getNotificationIcons();
          }
          if (!this._actionInProgress) {
            this._dialog._hide();
          }
        }

        const permission = await OneSignal._context._permissionManager._getPermissionStatus();
        const bellState = isSubscribed.current.optedIn
          ? BellState._Subscribed
          : permission === 'denied'
            ? BellState._Blocked
            : BellState._Unsubscribed;
        this._setState(bellState, this._ignoreSubscriptionState);
      },
    );

    OneSignal._emitter.on(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING, () =>
      this._updateState(),
    );
  }

  async _onSubscribeClick() {
    const subscribeButton = this._dialog._subscribeButton;
    if (subscribeButton) subscribeButton.disabled = true;
    this._ignoreSubscriptionState = true;
    this._actionInProgress = true;
    await OneSignal.User.PushSubscription.optIn();
    if (subscribeButton) subscribeButton.disabled = false;
    this._dialog._hide();
    await this._message._display(
      MessageType._Message,
      this._options.text['message.action.resubscribed'],
      MESSAGE_TIMEOUT,
    );
    this._ignoreSubscriptionState = false;
    this._actionInProgress = false;
    void this._updateState();
  }

  async _onUnsubscribeClick() {
    const unsubscribeButton = this._dialog._unsubscribeButton;
    if (unsubscribeButton) unsubscribeButton.disabled = true;
    this._actionInProgress = true;
    await OneSignal.User.PushSubscription.optOut();
    if (unsubscribeButton) unsubscribeButton.disabled = false;
    this._dialog._hide();
    await this._message._display(
      MessageType._Message,
      this._options.text['message.action.unsubscribed'],
      MESSAGE_TIMEOUT,
    );
    this._actionInProgress = false;
    void this._updateState();
  }

  private _addDefaultClasses() {
    const { position, theme } = this._options;
    const container = this._container;
    if (container) {
      addCssClass(container, `onesignal-bell-container-${position}`);
    }
    addCssClass(this._launcher._selector, `onesignal-bell-launcher-${position}`);
    addCssClass(this._launcher._selector, `onesignal-bell-launcher-theme-${theme}`);
  }

  async _create() {
    if (!this._options.enable) return;

    if (!CSS.supports('anchor-name: --a')) {
      Log._error('Bell requires CSS Anchor Positioning');
      return;
    }

    const sdkStylesLoadResult =
      await OneSignal._context._dynamicResourceLoader._loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState._Loaded) {
      Log._debug('Bell styles failed to load');
      return;
    }

    if (this._container) {
      removeDomElement('#onesignal-bell-container');
    }

    addDomElement(
      'body',
      'beforeend',
      '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>',
    );
    if (this._container) {
      addDomElement(
        this._container,
        'beforeend',
        '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>',
      );
    }

    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<button type="button" class="onesignal-bell-launcher-button" popovertarget="onesignal-bell-dialog"></button>',
    );
    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-badge"></div>',
    );
    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-message"></div>',
    );
    addDomElement(
      this._message._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-message-body"></div>',
    );
    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-dialog" id="onesignal-bell-dialog" popover="auto"></div>',
    );
    addDomElement(
      this._dialog._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-dialog-body"></div>',
    );

    addDomElement(this._button._selector, 'beforeend', logoSvg);

    this._launcher._element?.addEventListener('mouseleave', () => {
      this._button._element?.blur();
    });

    const dialogEl = this._dialog._element;
    if (dialogEl) {
      dialogEl.addEventListener('toggle', (e) => {
        const te = e as ToggleEvent;
        if (te.newState === 'open') {
          void this._dialog._updateContent();
          this._message._hide();
        }
      });
      dialogEl.addEventListener('beforetoggle', (e) => {
        const te = e as ToggleEvent;
        if (
          te.newState === 'open' &&
          this._message._shown &&
          this._message._contentType === MessageType._Message
        ) {
          e.preventDefault();
        }
      });
    }

    const isPushEnabled =
      await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
    wasPromptOfTypeDismissed(DismissPrompt._Push);

    this._launcher._resize(this._options.size || DEFAULT_SIZE);

    this._addDefaultClasses();
    this._applyOffsetIfSpecified();
    this._setCustomColorsIfSpecified();

    Log._info('Showing bell');

    if (isPushEnabled && this._dialog._notificationIcons === null) {
      this._dialog._notificationIcons = await getNotificationIcons();
    }

    await delay(this._options.showLauncherAfter || 0);
    this._launcher._show();

    await this._updateState();

    await delay(this._options.showBadgeAfter || 0);

    if (this._options.prenotify && !isPushEnabled && !this._blocked && OneSignal._isNewVisitor) {
      this._message._content = decodeHtmlEntities(this._options.text['message.prenotify']);
      this._badge._increment();
      this._badge._show();
    }

    this._initialized = true;
  }

  _applyOffsetIfSpecified() {
    const offset = this._options.offset;
    if (!offset) return;

    const element = this._launcher._element;
    if (!element) {
      Log._error('Bell element not found');
      return;
    }

    if (offset.bottom) element.style.bottom = offset.bottom;
    const side = this._options.position === 'bottom-right' ? offset.right : offset.left;
    if (side) {
      element.style[this._options.position === 'bottom-right' ? 'right' : 'left'] = side;
    }
  }

  _setCustomColorsIfSpecified() {
    const colors = this._options.colors;
    if (!colors) return;
    const el = this._launcher._element;
    if (!el) return;

    const setVar = (prop: string, value: string | undefined) => {
      if (value) el.style.setProperty(prop, value);
    };
    setVar('--bell-bg', colors['circle.background']);
    setVar('--bell-fg', colors['circle.foreground']);
    setVar('--badge-bg', colors['badge.background']);
    setVar('--badge-border', colors['badge.bordercolor']);
    setVar('--badge-fg', colors['badge.foreground']);
    setVar('--btn-bg', colors['dialog.button.background']);
    setVar('--btn-fg', colors['dialog.button.foreground']);
    setVar('--btn-hover-bg', colors['dialog.button.background.hovering']);
    setVar('--btn-active-bg', colors['dialog.button.background.active']);
    setVar('--pulse-color', colors['pulse.color']);
  }

  async _updateState() {
    try {
      const [isEnabled, permission] = await Promise.all([
        OneSignal._context._subscriptionManager._isPushNotificationsEnabled(),
        OneSignal._context._permissionManager._getPermissionStatus(),
      ]);
      const state =
        permission === 'denied'
          ? BellState._Blocked
          : isEnabled
            ? BellState._Subscribed
            : BellState._Unsubscribed;
      this._setState(state);
    } catch (e) {
      Log._error(e);
    }
  }

  _setState(newState: BellStateValue, silent = false) {
    const lastState = this._state;
    this._state = newState;
    if (lastState === newState || silent) return;

    if (!this._launcher._element) return;

    this._message._content = decodeHtmlEntities(this._message._getTipForState());
  }

  get _container() {
    return document.querySelector('#onesignal-bell-container');
  }

  get _launcher() {
    if (!this._launcherEl) this._launcherEl = new Launcher(this);
    return this._launcherEl;
  }

  get _button() {
    if (!this._buttonEl) this._buttonEl = new Button(this);
    return this._buttonEl;
  }

  get _badge() {
    if (!this._badgeEl) this._badgeEl = new Badge();
    return this._badgeEl;
  }

  get _message() {
    if (!this._messageEl) this._messageEl = new Message(this);
    return this._messageEl;
  }

  get _dialog() {
    if (!this._dialogEl) this._dialogEl = new Dialog(this);
    return this._dialogEl;
  }

  get _subscribed() {
    return this._state === BellState._Subscribed;
  }

  get _unsubscribed() {
    return this._state === BellState._Unsubscribed;
  }

  get _blocked() {
    return this._state === BellState._Blocked;
  }
}
