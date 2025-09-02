import type { AppUserConfigNotifyButton } from 'src/shared/config/types';
import {
  addCssClass,
  addDomElement,
  decodeHtmlEntities,
  removeDomElement,
} from 'src/shared/helpers/dom';
import { delay, nothing } from 'src/shared/helpers/general';
import type {
  BellPosition,
  BellSize,
  BellText,
} from 'src/shared/prompts/types';
import { DismissHelper } from '../../shared/helpers/DismissHelper';
import MainHelper from '../../shared/helpers/MainHelper';
import Log from '../../shared/libraries/Log';
import OneSignalEvent from '../../shared/services/OneSignalEvent';

import { DismissPrompt } from '../models/Dismiss';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import '../stylesheets/bell.css';
import Badge from './Badge';
import Button from './Button';
import Dialog from './Dialog';
import Launcher from './Launcher';
import Message from './Message';
import { MESSAGE_TIMEOUT, MessageType } from './constants';

const logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;

export type BellState =
  | 'uninitialized'
  | 'subscribed'
  | 'unsubscribed'
  | 'blocked';

const DEFAULT_SIZE: BellSize = 'medium';
const DEFAULT_POSITION: BellPosition = 'bottom-right';
const DEFAULT_THEME = 'default';

export default class Bell {
  public _options: AppUserConfigNotifyButton;
  public _state: BellState = 'uninitialized';
  public _ignoreSubscriptionState = false;
  public _hovering = false;
  public _initialized = false;
  private _showingDialog = false;
  public _launcherEl: Launcher | undefined;
  public _buttonEl: Button | undefined = undefined;
  public _badgeEl: Badge | undefined = undefined;
  public _messageEl: Message | undefined = undefined;
  public _dialogEl: Dialog | undefined = undefined;

  constructor(config: Partial<AppUserConfigNotifyButton>, launcher?: Launcher) {
    this._options = {
      enable: config.enable || false,
      size: config.size || DEFAULT_SIZE,
      position: config.position || DEFAULT_POSITION,
      theme: config.theme || DEFAULT_THEME,
      showLauncherAfter: config.showLauncherAfter || 10,
      showBadgeAfter: config.showBadgeAfter || 300,
      text: this._setDefaultTextOptions(config.text || {}),
      prenotify: config.prenotify,
      showCredit: config.showCredit,
      colors: config.colors,
      offset: config.offset,
    };

    if (launcher) {
      this._launcherEl = launcher;
    }

    if (!this._options.enable) return;

    this._state = 'uninitialized';
    this._ignoreSubscriptionState = false;

    this._installEventHooks();
    this._updateState();
  }

  async _showDialogProcedure() {
    // Prevent concurrent dialog operations (fixes GitHub issue #409)
    if (this._showingDialog || this._dialog._shown) {
      return;
    }
    this._showingDialog = true;

    try {
      await this._dialog._show();
      // Dialog stays open until user explicitly closes it via button actions
      // No more complex document click handling!
    } finally {
      this._showingDialog = false;
    }
  }

  private _setDefaultTextOptions(text: Partial<BellText>): BellText {
    const finalText: BellText = {
      'tip.state.unsubscribed':
        text['tip.state.unsubscribed'] || 'Subscribe to notifications',
      'tip.state.subscribed':
        text['tip.state.subscribed'] || "You're subscribed to notifications",
      'tip.state.blocked':
        text['tip.state.blocked'] || "You've blocked notifications",
      'message.prenotify':
        text['message.prenotify'] || 'Click to subscribe to notifications',
      'message.action.subscribed':
        text['message.action.subscribed'] || 'Thanks for subscribing!',
      'message.action.resubscribed':
        text['message.action.resubscribed'] ||
        "You're subscribed to notifications",
      'message.action.subscribing':
        text['message.action.subscribing'] ||
        'Click <strong>{{prompt.native.grant}}</strong> to receive notifications',
      'message.action.unsubscribed':
        text['message.action.unsubscribed'] ||
        "You won't receive notifications again",
      'dialog.main.title':
        text['dialog.main.title'] || 'Manage Site Notifications',
      'dialog.main.button.subscribe':
        text['dialog.main.button.subscribe'] || 'SUBSCRIBE',
      'dialog.main.button.unsubscribe':
        text['dialog.main.button.unsubscribe'] || 'UNSUBSCRIBE',
      'dialog.blocked.title':
        text['dialog.blocked.title'] || 'Unblock Notifications',
      'dialog.blocked.message':
        text['dialog.blocked.message'] ||
        'Follow these instructions to allow notifications:',
    };
    return finalText;
  }

  private _installEventHooks() {
    // Install event hooks
    OneSignal.emitter.on('notifyButtonSubscribeClick', () => {
      this._dialog!._subscribeButton!.disabled = true;
      this._ignoreSubscriptionState = true;
      OneSignal.User.PushSubscription.optIn()
        .then(() => {
          this._dialog!._subscribeButton!.disabled = false;
          return this._dialog._hide();
        })
        .then(() => {
          return this._message._display(
            MessageType._Message,
            this._options.text['message.action.resubscribed'],
            MESSAGE_TIMEOUT,
          );
        })
        .then(() => {
          this._ignoreSubscriptionState = false;
          this._launcher._clearIfWasInactive();
          return this._launcher._inactivate();
        })
        .then(() => {
          return this._updateState();
        })
        .catch((e) => {
          throw e;
        });
    });

    OneSignal.emitter.on('notifyButtonUnsubscribeClick', () => {
      this._dialog!._unsubscribeButton!.disabled = true;
      OneSignal.User.PushSubscription.optOut()
        .then(() => {
          this._dialog!._unsubscribeButton!.disabled = false;
          return this._dialog._hide();
        })
        .then(() => {
          this._launcher._clearIfWasInactive();
          return this._launcher._activate();
        })
        .then(() => {
          return this._message._display(
            MessageType._Message,
            this._options.text['message.action.unsubscribed'],
            MESSAGE_TIMEOUT,
          );
        })
        .then(() => {
          return this._updateState();
        });
    });

    OneSignal.emitter.on('notifyButtonHovering', () => {
      this._hovering = true;
      this._launcher._activateIfInactive();

      // If there's already a message being force shown, do not override
      if (this._message._shown || this._dialog._shown) {
        this._hovering = false;
        return;
      }

      // If the message is a message and not a tip, don't show it (only show tips)
      // Messages will go away on their own
      if (this._message._contentType === MessageType._Message) {
        this._hovering = false;
        return;
      }

      new Promise<void>((resolve) => {
        // If a message is being shown
        if (this._message._queued.length > 0) {
          return this._message._dequeue().then((msg) => {
            this._message._content = msg as string;
            this._message._contentType = MessageType._Queued;
            resolve();
          });
        } else {
          this._message._content = decodeHtmlEntities(
            this._message._getTipForState(),
          );
          this._message._contentType = MessageType._Tip;
          resolve();
        }
      })
        .then(() => {
          return this._message._show();
        })
        .then(() => {
          this._hovering = false;
        })
        .catch((err) => {
          Log._error(err);
        });
    });

    OneSignal.emitter.on('notifyButtonHover', () => {
      // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
      if (this._message._contentType === MessageType._Message) {
        return;
      }

      // If the dialog is being brought up when clicking button, don't shrink
      if (this._dialog._shown) {
        return;
      }

      if (this._hovering) {
        this._hovering = false;
        // Hovering still being true here happens on mobile where the message could still be showing (i.e. animating)
        // when a HOVERED event fires. In other words, you tap on mobile, HOVERING fires, and then HOVERED fires
        // immediately after because of the way mobile click events work. Basically only happens if HOVERING and HOVERED
        // fire within a few milliseconds of each other
        this._message
          ._show()
          .then(() => delay(MESSAGE_TIMEOUT))
          .then(() => this._message._hide())
          .then(() => {
            if (this._launcher._wasInactive && !this._dialog._shown) {
              this._launcher._inactivate();
              this._launcher._wasInactive = false;
            }
          });
      }

      if (this._message._shown) {
        this._message._hide().then(() => {
          if (this._launcher._wasInactive && !this._dialog._shown) {
            this._launcher._inactivate();
            this._launcher._wasInactive = false;
          }
        });
      }
    });

    OneSignal.emitter.on('change', async (isSubscribed) => {
      if (isSubscribed?.current.optedIn) {
        if (this._badge._shown && this._options.prenotify) {
          this._badge._hide();
        }
        if (this._dialog._notificationIcons === null) {
          const icons = await MainHelper.getNotificationIcons();
          this._dialog._notificationIcons = icons;
        }
      }

      const permission =
        await OneSignal.context._permissionManager.getPermissionStatus();
      let bellState: BellState;
      if (isSubscribed?.current.optedIn) {
        bellState = 'subscribed';
      } else if (permission === 'denied') {
        bellState = 'blocked';
      } else {
        bellState = 'unsubscribed';
      }
      this._setState(bellState, this._ignoreSubscriptionState);
    });

    OneSignal.emitter.on('notifyButtonStateChange', (state) => {
      if (!this._launcher._element) {
        // Notify button doesn't exist
        return;
      }
      if (state.to === 'subscribed') {
        this._launcher._inactivate();
      } else if (state.to === 'unsubscribed' || state.to === 'blocked') {
        this._launcher._activate();
      }
    });

    OneSignal.emitter.on('permissionChangeAsString', () => {
      this._updateState();
    });
  }

  private _addDefaultClasses() {
    // Add default classes
    const container = this._container;
    if (this._options.position === 'bottom-left') {
      if (container) {
        addCssClass(container, 'onesignal-bell-container-bottom-left');
      }
      addCssClass(
        this._launcher._selector,
        'onesignal-bell-launcher-bottom-left',
      );
    } else if (this._options.position === 'bottom-right') {
      if (container) {
        addCssClass(container, 'onesignal-bell-container-bottom-right');
      }
      addCssClass(
        this._launcher._selector,
        'onesignal-bell-launcher-bottom-right',
      );
    } else {
      throw new Error(
        `Invalid OneSignal notify button position ${this._options.position}`,
      );
    }

    if (this._options.theme === 'default') {
      addCssClass(
        this._launcher._selector,
        'onesignal-bell-launcher-theme-default',
      );
    } else if (this._options.theme === 'inverse') {
      addCssClass(
        this._launcher._selector,
        'onesignal-bell-launcher-theme-inverse',
      );
    } else {
      throw new Error(
        `Invalid OneSignal notify button theme ${this._options.theme}`,
      );
    }
  }

  async _create() {
    if (!this._options.enable) return;

    const sdkStylesLoadResult =
      await OneSignal.context._dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
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
      await OneSignal.context._subscriptionManager.isPushNotificationsEnabled();
    DismissHelper.wasPromptOfTypeDismissed(DismissPrompt.Push);

    // Resize to small instead of specified size if enabled, otherwise there's a jerking motion
    // where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
    const resizeTo = isPushEnabled
      ? 'small'
      : this._options.size || DEFAULT_SIZE;
    await this._launcher._resize(resizeTo);

    this._addDefaultClasses();
    this._applyOffsetIfSpecified();
    this._setCustomColorsIfSpecified();

    Log._info('Showing the notify button.');

    await (isPushEnabled ? this._launcher._inactivate() : nothing())
      .then(() => {
        if (isPushEnabled && this._dialog._notificationIcons === null) {
          return MainHelper.getNotificationIcons().then((icons) => {
            this._dialog._notificationIcons = icons;
          });
        } else return nothing();
      })
      .then(() => delay(this._options.showLauncherAfter || 0))
      .then(() => {
        return this._launcher._show();
      })
      .then(() => {
        return delay(this._options.showBadgeAfter || 0);
      })
      .then(() => {
        if (
          this._options.prenotify &&
          !isPushEnabled &&
          OneSignal._isNewVisitor
        ) {
          return this._message
            ._enqueue(this._options.text['message.prenotify'])
            .then(() => this._badge._show());
        } else return nothing();
      })
      .then(() => (this._initialized = true));
  }

  _applyOffsetIfSpecified() {
    const offset = this._options.offset;
    if (offset) {
      const element = this._launcher._element as HTMLElement;

      if (!element) {
        Log._error('Could not find bell dom element');
        return;
      }
      // Reset styles first
      element.style.cssText = '';

      if (offset.bottom) {
        element.style.cssText += `bottom: ${offset.bottom};`;
      }

      if (this._options.position === 'bottom-right') {
        if (offset.right) {
          element.style.cssText += `right: ${offset.right};`;
        }
      } else if (this._options.position === 'bottom-left') {
        if (offset.left) {
          element.style.cssText += `left: ${offset.left};`;
        }
      }
    }
  }

  public _setCustomColorsIfSpecified() {
    const container = this._container;
    if (!container || !this._options.colors) return;

    Object.entries(this._options.colors).forEach(([key, color]) => {
      const cssVarName = `--onesignal-${key.replace(/\./g, '-')}`;
      (container as HTMLElement).style.setProperty(cssVarName, color);
    });
  }

  _addCssToHead(id: string, css: string) {
    const existingStyleDom = document.getElementById(id);
    if (existingStyleDom) return;
    const styleDom = document.createElement('style');
    styleDom.id = id;
    styleDom.appendChild(document.createTextNode(css));
    document.head.appendChild(styleDom);
  }

  /**
   * Updates the current state to the correct new current state. Returns a promise.
   */
  _updateState() {
    Promise.all([
      OneSignal.context._subscriptionManager.isPushNotificationsEnabled(),
      OneSignal.context._permissionManager.getPermissionStatus(),
    ])
      .then(([isEnabled, permission]) => {
        this._setState(isEnabled ? 'subscribed' : 'unsubscribed');
        if (permission === 'denied') {
          this._setState('blocked');
        }
      })
      .catch((e) => {
        Log._error(e);
      });
  }

  /**
   * Updates the current state to the specified new state.
   * @param newState One of ['subscribed', 'unsubscribed'].
   */
  _setState(newState: BellState, silent = false) {
    const lastState = this._state;
    this._state = newState;
    if (lastState !== newState && !silent) {
      OneSignalEvent.trigger('notifyButtonStateChange', {
        from: lastState,
        to: newState,
      });
      // Update anything that should be changed here in the new state
    }

    // Update anything that should be reset to the same state
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
    return this._state === 'subscribed';
  }

  get _unsubscribed() {
    return this._state === 'unsubscribed';
  }

  get _blocked() {
    return this._state === 'blocked';
  }
}
