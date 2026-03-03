import type { AppUserConfigNotifyButton } from 'src/shared/config/types';
import {
  addCssClass,
  addDomElement,
  decodeHtmlEntities,
  removeDomElement,
} from 'src/shared/helpers/dom';
import { delay } from 'src/shared/helpers/general';
import type {
  BellPosition,
  BellSize,
  BellText,
} from 'src/shared/prompts/types';
import { wasPromptOfTypeDismissed } from '../../shared/helpers/dismiss';
import { getNotificationIcons } from '../../shared/helpers/main';
import Log from '../../shared/libraries/Log';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import { once } from '../../shared/utils/utils';
import { DismissPrompt } from '../models/Dismiss';
import type { SubscriptionChangeEvent } from '../models/SubscriptionChangeEvent';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import Badge from './Badge';
import Button from './Button';
import Dialog from './Dialog';
import Launcher from './Launcher';
import Message from './Message';
import {
  BellEvent,
  BellState,
  type BellStateValue,
  MESSAGE_TIMEOUT,
  MessageType,
} from './constants';

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
  public _hovering = false;
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
    this._updateState();
  }

  async _showDialogProcedure() {
    if (this._dialog._shown) return;

    await this._dialog._show();
    once(
      document,
      'click',
      async (e: Event, destroyEventListener: () => void) => {
        if (this._dialog._element?.contains(e.target as Node)) return;
        destroyEventListener();
        if (this._dialog._shown) {
          await this._dialog._hide();
          await this._launcher._inactivateIfWasInactive();
        }
      },
      true,
    );
  }

  private _validateOptions(options: AppUserConfigNotifyButton) {
    if (!options.size || !VALID_SIZES.includes(options.size))
      throw new Error(
        `Invalid size ${options.size} for notify button. Choose among 'small', 'medium', or 'large'.`,
      );
    if (!options.position || !VALID_POSITIONS.includes(options.position))
      throw new Error(
        `Invalid position ${options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`,
      );
    if (!options.theme || !VALID_THEMES.includes(options.theme))
      throw new Error(
        `Invalid theme ${options.theme} for notify button. Choose either 'default', or 'inverse'.`,
      );
    if (!options.showLauncherAfter || options.showLauncherAfter < 0)
      throw new Error(
        `Invalid delay duration of ${this._options.showLauncherAfter} for showing the notify button. Choose a value above 0.`,
      );
    if (!options.showBadgeAfter || options.showBadgeAfter < 0)
      throw new Error(
        `Invalid delay duration of ${this._options.showBadgeAfter} for showing the notify button's badge. Choose a value above 0.`,
      );
  }

  private _installEventHooks() {
    OneSignal._emitter.on(BellEvent._SubscribeClick, async () => {
      const subscribeButton = this._dialog._subscribeButton;
      if (subscribeButton) subscribeButton.disabled = true;
      this._ignoreSubscriptionState = true;
      await OneSignal.User.PushSubscription.optIn();
      if (subscribeButton) subscribeButton.disabled = false;
      await this._dialog._hide();
      await this._message._display(
        MessageType._Message,
        this._options.text['message.action.resubscribed'],
        MESSAGE_TIMEOUT,
      );
      this._ignoreSubscriptionState = false;
      this._launcher._clearIfWasInactive();
      await this._launcher._inactivate();
      this._updateState();
    });

    OneSignal._emitter.on(BellEvent._UnsubscribeClick, async () => {
      const unsubscribeButton = this._dialog._unsubscribeButton;
      if (unsubscribeButton) unsubscribeButton.disabled = true;
      await OneSignal.User.PushSubscription.optOut();
      if (unsubscribeButton) unsubscribeButton.disabled = false;
      await this._dialog._hide();
      this._launcher._clearIfWasInactive();
      await this._launcher._activate();
      await this._message._display(
        MessageType._Message,
        this._options.text['message.action.unsubscribed'],
        MESSAGE_TIMEOUT,
      );
      this._updateState();
    });

    OneSignal._emitter.on(BellEvent._Hovering, async () => {
      this._hovering = true;
      this._launcher._activateIfInactive();

      if (this._message._shown || this._dialog._shown) {
        this._hovering = false;
        return;
      }
      if (this._message._contentType === MessageType._Message) {
        this._hovering = false;
        return;
      }

      try {
        if (this._message._queued.length > 0) {
          const msg = await this._message._dequeue();
          this._message._content = msg;
          this._message._contentType = MessageType._Queued;
        } else {
          this._message._content = decodeHtmlEntities(
            this._message._getTipForState(),
          );
          this._message._contentType = MessageType._Tip;
        }
        await this._message._show();
        this._hovering = false;
      } catch (err) {
        Log._error(err);
      }
    });

    OneSignal._emitter.on(BellEvent._Hovered, async () => {
      if (this._message._contentType === MessageType._Message) return;
      if (this._dialog._shown) return;

      if (this._hovering) {
        this._hovering = false;
        await this._message._show();
        await delay(MESSAGE_TIMEOUT);
        await this._message._hide();
        if (this._launcher._wasInactive && !this._dialog._shown) {
          await this._launcher._inactivate();
          this._launcher._wasInactive = false;
        }
      }

      if (this._message._shown) {
        await this._message._hide();
        if (this._launcher._wasInactive && !this._dialog._shown) {
          await this._launcher._inactivate();
          this._launcher._wasInactive = false;
        }
      }
    });

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
        }

        const permission =
          await OneSignal._context._permissionManager._getPermissionStatus();
        const bellState = isSubscribed.current.optedIn
          ? BellState._Subscribed
          : permission === 'denied'
            ? BellState._Blocked
            : BellState._Unsubscribed;
        this._setState(bellState, this._ignoreSubscriptionState);
      },
    );

    OneSignal._emitter.on(BellEvent._StateChanged, (state) => {
      if (!this._launcher._element) return;
      if (state.to === BellState._Subscribed) {
        this._launcher._inactivate();
      } else if (
        state.to === BellState._Unsubscribed ||
        state.to === BellState._Blocked
      ) {
        this._launcher._activate();
      }
    });

    OneSignal._emitter.on(
      OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
      () => this._updateState(),
    );
  }

  private _addDefaultClasses() {
    const { position, theme } = this._options;
    const container = this._container;
    if (container) {
      addCssClass(container, `onesignal-bell-container-${position}`);
    }
    addCssClass(
      this._launcher._selector,
      `onesignal-bell-launcher-${position}`,
    );
    addCssClass(
      this._launcher._selector,
      `onesignal-bell-launcher-theme-${theme}`,
    );
  }

  async _create() {
    if (!this._options.enable) return;

    const sdkStylesLoadResult =
      await OneSignal._context._dynamicResourceLoader._loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState._Loaded) {
      Log._debug('Not showing notify button because styles failed to load.');
      return;
    }

    // Remove any existing bell
    if (this._container) {
      removeDomElement('#onesignal-bell-container');
    }

    // Insert the bell container
    addDomElement(
      'body',
      'beforeend',
      '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>',
    );
    if (this._container) {
      // Insert the bell launcher
      addDomElement(
        this._container,
        'beforeend',
        '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>',
      );
    }

    // Insert the bell launcher button
    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-button"></div>',
    );
    // Insert the bell launcher badge
    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-badge"></div>',
    );
    // Insert the bell launcher message
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
    // Insert the bell launcher dialog
    addDomElement(
      this._launcher._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-dialog"></div>',
    );
    addDomElement(
      this._dialog._selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-dialog-body"></div>',
    );

    // Install events

    // Add visual elements
    addDomElement(this._button._selector, 'beforeend', logoSvg);

    const isPushEnabled =
      await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
    wasPromptOfTypeDismissed(DismissPrompt._Push);

    // Resize to small instead of specified size if enabled, otherwise there's a jerking motion
    // where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
    const resizeTo = isPushEnabled
      ? 'small'
      : this._options.size || DEFAULT_SIZE;
    await this._launcher._resize(resizeTo);

    this._addDefaultClasses();

    this._applyOffsetIfSpecified();
    this._setCustomColorsIfSpecified();
    this._addBadgeShadow();

    Log._info('Showing the notify button.');

    if (isPushEnabled) {
      await this._launcher._inactivate();
      if (this._dialog._notificationIcons === null) {
        this._dialog._notificationIcons = await getNotificationIcons();
      }
    }

    await delay(this._options.showLauncherAfter || 0);
    await this._launcher._show();
    await delay(this._options.showBadgeAfter || 0);

    if (this._options.prenotify && !isPushEnabled && OneSignal._isNewVisitor) {
      await this._message._enqueue(this._options.text['message.prenotify']);
      await this._badge._show();
    }

    this._initialized = true;
  }

  _addBadgeShadow() {
    const bellShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0.35));`;
    const badgeShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0));`;
    const dialogShadow = `drop-shadow(0px 2px 2px rgba(34,36,38,.15));`;
    this._graphic?.setAttribute(
      'style',
      `filter: ${bellShadow}; -webkit-filter: ${bellShadow};`,
    );
    this._badge?._element?.setAttribute(
      'style',
      `filter: ${badgeShadow}; -webkit-filter: ${badgeShadow};`,
    );
    this._dialog?._element?.setAttribute(
      'style',
      `filter: ${dialogShadow}; -webkit-filter: ${dialogShadow};`,
    );
  }

  _applyOffsetIfSpecified() {
    const offset = this._options.offset;
    if (!offset) return;

    const element = this._launcher._element;
    if (!element) {
      Log._error('Could not find bell dom element');
      return;
    }

    element.style.cssText = '';
    if (offset.bottom) element.style.bottom = offset.bottom;
    const side =
      this._options.position === 'bottom-right' ? offset.right : offset.left;
    if (side) {
      element.style[
        this._options.position === 'bottom-right' ? 'right' : 'left'
      ] = side;
    }
  }

  _setCustomColorsIfSpecified() {
    const graphic = this._graphic;
    const background = graphic?.querySelector<HTMLElement>('.background');
    const foregrounds =
      graphic?.querySelectorAll<HTMLElement>('.foreground') ?? [];
    const stroke = graphic?.querySelector<HTMLElement>('.stroke');
    const badgeElement = this._badge._element;
    const dialogElement = this._dialog._element;
    const actionButton =
      dialogElement?.querySelector<HTMLButtonElement>('button.action');
    const pulseRing =
      this._button._element?.querySelector<HTMLElement>('.pulse-ring');

    // Reset styles
    const resetTargets = [background, stroke, badgeElement, actionButton, pulseRing];
    for (const el of resetTargets) {
      if (el) el.style.cssText = '';
    }
    for (const el of foregrounds) {
      if (el) el.style.cssText = '';
    }

    const colors = this._options.colors;
    if (!colors) return;

    if (colors['circle.background'] && background) {
      background.style.cssText = `fill: ${colors['circle.background']}`;
    }
    if (colors['circle.foreground']) {
      for (const el of foregrounds) {
        if (el) el.style.cssText = `fill: ${colors['circle.foreground']}`;
      }
      if (stroke) {
        stroke.style.cssText = `stroke: ${colors['circle.foreground']}`;
      }
    }
    if (badgeElement) {
      if (colors['badge.background'])
        badgeElement.style.cssText += `background: ${colors['badge.background']};`;
      if (colors['badge.bordercolor'])
        badgeElement.style.cssText += `border-color: ${colors['badge.bordercolor']};`;
      if (colors['badge.foreground'])
        badgeElement.style.cssText += `color: ${colors['badge.foreground']};`;
    }
    if (actionButton) {
      if (colors['dialog.button.background'])
        actionButton.style.cssText += `background: ${colors['dialog.button.background']};`;
      if (colors['dialog.button.foreground'])
        actionButton.style.cssText += `color: ${colors['dialog.button.foreground']};`;
    }
    if (colors['dialog.button.background.hovering']) {
      this._addCssToHead(
        'onesignal-background-hover-style',
        `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:hover { background: ${colors['dialog.button.background.hovering']} !important; }`,
      );
    }
    if (colors['dialog.button.background.active']) {
      this._addCssToHead(
        'onesignal-background-active-style',
        `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:active { background: ${colors['dialog.button.background.active']} !important; }`,
      );
    }
    if (colors['pulse.color'] && pulseRing) {
      pulseRing.style.cssText = `border-color: ${colors['pulse.color']}`;
    }
  }

  _addCssToHead(id: string, css: string) {
    const existingStyleDom = document.getElementById(id);
    if (existingStyleDom) return;
    const styleDom = document.createElement('style');
    styleDom.id = id;
    styleDom.type = 'text/css';
    styleDom.appendChild(document.createTextNode(css));
    document.head.appendChild(styleDom);
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
    if (lastState !== newState && !silent) {
      OneSignalEvent._trigger(BellEvent._StateChanged, {
        from: lastState,
        to: newState,
      });
    }
  }

  get _container() {
    return document.querySelector('#onesignal-bell-container');
  }

  get _graphic() {
    return this._buttonEl?._element?.querySelector('svg');
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
