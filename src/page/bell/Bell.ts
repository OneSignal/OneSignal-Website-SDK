import type { AppUserConfigNotifyButton } from 'src/shared/config/types';
import { containsMatch } from 'src/shared/context/helpers';
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
import { wasPromptOfTypeDismissed } from '../../shared/helpers/DismissHelper';
import MainHelper from '../../shared/helpers/MainHelper';
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

    this._validateOptions(this._options);
    this._state = BellState._Uninitialized;
    this._ignoreSubscriptionState = false;

    this._installEventHooks();
    this._updateState();
  }

  _showDialogProcedure() {
    if (!this._dialog._shown) {
      this._dialog._show().then(() => {
        once(
          document,
          'click',
          (e: Event, destroyEventListener: () => void) => {
            const wasDialogClicked = this._dialog._element?.contains(
              e.target as Node,
            );
            if (wasDialogClicked) {
              return;
            }
            destroyEventListener();
            if (this._dialog._shown) {
              this._dialog._hide().then(() => {
                this._launcher._inactivateIfWasInactive();
              });
            }
          },
          true,
        );
      });
    }
  }

  private _validateOptions(options: AppUserConfigNotifyButton) {
    if (
      !options.size ||
      !containsMatch(['small', 'medium', 'large'], options.size)
    )
      throw new Error(
        `Invalid size ${options.size} for notify button. Choose among 'small', 'medium', or 'large'.`,
      );
    if (
      !options.position ||
      !containsMatch(['bottom-left', 'bottom-right'], options.position)
    )
      throw new Error(
        `Invalid position ${options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`,
      );
    if (!options.theme || !containsMatch(['default', 'inverse'], options.theme))
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
    OneSignal._emitter.on(BellEvent._SubscribeClick, () => {
      const subscribeButton = this._dialog._subscribeButton;
      if (subscribeButton) {
        subscribeButton.disabled = true;
      }
      this._ignoreSubscriptionState = true;
      OneSignal.User.PushSubscription.optIn()
        .then(() => {
          if (subscribeButton) {
            subscribeButton.disabled = false;
          }
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

    OneSignal._emitter.on(BellEvent._UnsubscribeClick, () => {
      const unsubscribeButton = this._dialog._unsubscribeButton;
      if (unsubscribeButton) {
        unsubscribeButton.disabled = true;
      }
      OneSignal.User.PushSubscription.optOut()
        .then(() => {
          if (unsubscribeButton) {
            unsubscribeButton.disabled = false;
          }
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

    OneSignal._emitter.on(BellEvent._Hovering, () => {
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
          return this._message._dequeue().then((msg: any) => {
            this._message._content = msg;
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

    OneSignal._emitter.on(BellEvent._Hovered, () => {
      // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
      if (this._message._contentType === MessageType._Message) {
        return;
      }

      if (this._dialog._shown) {
        // If the dialog is being brought up when clicking button, don't shrink
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

    OneSignal._emitter.on(
      OneSignal.EVENTS.SUBSCRIPTION_CHANGED,
      async (isSubscribed: SubscriptionChangeEvent) => {
        if (isSubscribed.current.optedIn) {
          if (this._badge._shown && this._options.prenotify) {
            this._badge._hide();
          }
          if (this._dialog._notificationIcons === null) {
            const icons = await MainHelper._getNotificationIcons();
            this._dialog._notificationIcons = icons;
          }
        }

        const permission =
          await OneSignal._context._permissionManager._getPermissionStatus();
        let bellState: BellStateValue;
        if (isSubscribed.current.optedIn) {
          bellState = BellState._Subscribed;
        } else if (permission === 'denied') {
          bellState = BellState._Blocked;
        } else {
          bellState = BellState._Unsubscribed;
        }
        this._setState(bellState, this._ignoreSubscriptionState);
      },
    );

    OneSignal._emitter.on(BellEvent._StateChanged, (state) => {
      if (!this._launcher._element) {
        // Notify button doesn't exist
        return;
      }
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
      () => {
        this._updateState();
      },
    );
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
      await OneSignal._context._dynamicResourceLoader._loadSdkStylesheet();
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
      await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
    wasPromptOfTypeDismissed(DismissPrompt.Push);

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

    await (isPushEnabled ? this._launcher._inactivate() : nothing())
      .then(() => {
        if (isPushEnabled && this._dialog._notificationIcons === null) {
          return MainHelper._getNotificationIcons().then((icons) => {
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

  _setCustomColorsIfSpecified() {
    // Some common vars first
    const dialogElement = this._dialog._element;
    const dialogButton =
      dialogElement?.querySelector<HTMLButtonElement>('button.action');
    const buttonElement = this._button._element;
    const pulseRing = buttonElement?.querySelector<HTMLElement>('.pulse-ring');

    // Reset added styles first
    const background = this._graphic?.querySelector<HTMLElement>('.background');
    if (background) {
      background.style.cssText = '';
    }
    const foregroundElements =
      this._graphic?.querySelectorAll<HTMLElement>('.foreground') ?? [];
    for (let i = 0; i < foregroundElements.length; i++) {
      const element = foregroundElements[i];
      if (element) {
        element.style.cssText = '';
      }
    }
    const stroke = this._graphic?.querySelector<HTMLElement>('.stroke');
    if (stroke) {
      stroke.style.cssText = '';
    }

    const badgeElement = this._badge._element;
    if (badgeElement) {
      badgeElement.style.cssText = '';
    }

    if (dialogButton) {
      dialogButton.style.cssText = '';
    }
    if (pulseRing) {
      pulseRing.style.cssText = '';
    }

    // Set new styles
    if (this._options.colors) {
      const colors = this._options.colors;
      if (colors['circle.background']) {
        const background =
          this._graphic?.querySelector<HTMLElement>('.background');
        if (background) {
          background.style.cssText += `fill: ${colors['circle.background']}`;
        }
      }
      if (colors['circle.foreground']) {
        const foregroundElements =
          this._graphic?.querySelectorAll<HTMLElement>('.foreground') ?? [];
        for (let i = 0; i < foregroundElements.length; i++) {
          const element = foregroundElements[i];
          if (element) {
            element.style.cssText += `fill: ${colors['circle.foreground']}`;
          }
        }
        const stroke = this._graphic?.querySelector<HTMLElement>('.stroke');
        if (stroke) {
          stroke.style.cssText += `stroke: ${colors['circle.foreground']}`;
        }
      }
      if (colors['badge.background'] && badgeElement) {
        badgeElement.style.cssText += `background: ${colors['badge.background']}`;
      }
      if (colors['badge.bordercolor'] && badgeElement) {
        badgeElement.style.cssText += `border-color: ${colors['badge.bordercolor']}`;
      }
      if (colors['badge.foreground'] && badgeElement) {
        badgeElement.style.cssText += `color: ${colors['badge.foreground']}`;
      }
      if (dialogButton && dialogElement) {
        if (colors['dialog.button.background']) {
          const actionButton =
            dialogElement.querySelector<HTMLButtonElement>('button.action');
          if (actionButton) {
            actionButton.style.cssText += `background: ${colors['dialog.button.background']}`;
          }
        }
        if (colors['dialog.button.foreground']) {
          const actionButton =
            dialogElement.querySelector<HTMLButtonElement>('button.action');
          if (actionButton) {
            actionButton.style.cssText += `color: ${colors['dialog.button.foreground']}`;
          }
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
      }
      if (colors['pulse.color']) {
        const pulseRingElement =
          buttonElement?.querySelector<HTMLElement>('.pulse-ring');
        if (pulseRingElement) {
          pulseRingElement.style.cssText = `border-color: ${colors['pulse.color']}`;
        }
      }
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

  /**
   * Updates the current state to the correct new current state. Returns a promise.
   */
  _updateState() {
    Promise.all([
      OneSignal._context._subscriptionManager._isPushNotificationsEnabled(),
      OneSignal._context._permissionManager._getPermissionStatus(),
    ])
      .then(([isEnabled, permission]) => {
        this._setState(
          isEnabled ? BellState._Subscribed : BellState._Unsubscribed,
        );
        if (permission === 'denied') {
          this._setState(BellState._Blocked);
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
  _setState(newState: BellStateValue, silent = false) {
    const lastState = this._state;
    this._state = newState;
    if (lastState !== newState && !silent) {
      OneSignalEvent._trigger(BellEvent._StateChanged, {
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
