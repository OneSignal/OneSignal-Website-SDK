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
import { Browser } from 'src/shared/useragent/constants';
import { getBrowserName } from 'src/shared/useragent/detect';
import { DismissHelper } from '../../shared/helpers/DismissHelper';
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

const logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;

type BellState = 'uninitialized' | 'subscribed' | 'unsubscribed' | 'blocked';

const DEFAULT_SIZE: BellSize = 'medium';
const DEFAULT_POSITION: BellPosition = 'bottom-right';
const DEFAULT_THEME = 'default';

export default class Bell {
  public _options: AppUserConfigNotifyButton;
  public _state: BellState = Bell._STATES.UNINITIALIZED;
  public _ignoreSubscriptionState = false;
  public _hovering = false;
  public _initialized = false;
  public _launcher: Launcher | undefined;
  public _button: Button | undefined = undefined;
  public _badge: Badge | undefined = undefined;
  public _message: Message | undefined = undefined;
  public _dialog: Dialog | undefined = undefined;

  static get _EVENTS() {
    return {
      STATE_CHANGED: 'notifyButtonStateChange',
      LAUNCHER_CLICK: 'notifyButtonLauncherClick',
      BELL_CLICK: 'notifyButtonButtonClick',
      SUBSCRIBE_CLICK: 'notifyButtonSubscribeClick',
      UNSUBSCRIBE_CLICK: 'notifyButtonUnsubscribeClick',
      HOVERING: 'notifyButtonHovering',
      HOVERED: 'notifyButtonHover',
    };
  }

  static get _STATES() {
    return {
      UNINITIALIZED: 'uninitialized' as BellState,
      SUBSCRIBED: 'subscribed' as BellState,
      UNSUBSCRIBED: 'unsubscribed' as BellState,
      BLOCKED: 'blocked' as BellState,
    };
  }

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
      this._launcher = launcher;
    }

    if (!this._options.enable) return;

    this._validateOptions(this._options);
    this._state = Bell._STATES.UNINITIALIZED;
    this._ignoreSubscriptionState = false;

    this._installEventHooks();
    this._updateState();
  }

  _showDialogProcedure() {
    if (!this.__dialog.shown) {
      this.__dialog.show().then(() => {
        once(
          document,
          'click',
          (e: Event, destroyEventListener: () => void) => {
            const wasDialogClicked = this.__dialog!.element!.contains(
              e.target as Node,
            );
            if (wasDialogClicked) {
              return;
            }
            destroyEventListener();
            if (this.__dialog.shown) {
              this.__dialog.hide().then(() => {
                this.__launcher.inactivateIfWasInactive();
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
    OneSignal.emitter.on(Bell._EVENTS.SUBSCRIBE_CLICK, () => {
      this.__dialog!.subscribeButton!.disabled = true;
      this._ignoreSubscriptionState = true;
      OneSignal.User.PushSubscription.optIn()
        .then(() => {
          this.__dialog!.subscribeButton!.disabled = false;
          return this.__dialog.hide();
        })
        .then(() => {
          return this.__message.display(
            Message.TYPES.MESSAGE,
            this._options.text['message.action.resubscribed'],
            Message.TIMEOUT,
          );
        })
        .then(() => {
          this._ignoreSubscriptionState = false;
          this.__launcher.clearIfWasInactive();
          return this.__launcher.inactivate();
        })
        .then(() => {
          return this._updateState();
        })
        .catch((e) => {
          throw e;
        });
    });

    OneSignal.emitter.on(Bell._EVENTS.UNSUBSCRIBE_CLICK, () => {
      this.__dialog!.unsubscribeButton!.disabled = true;
      OneSignal.User.PushSubscription.optOut()
        .then(() => {
          this.__dialog!.unsubscribeButton!.disabled = false;
          return this.__dialog.hide();
        })
        .then(() => {
          this.__launcher.clearIfWasInactive();
          return this.__launcher.activate();
        })
        .then(() => {
          return this.__message.display(
            Message.TYPES.MESSAGE,
            this._options.text['message.action.unsubscribed'],
            Message.TIMEOUT,
          );
        })
        .then(() => {
          return this._updateState();
        });
    });

    OneSignal.emitter.on(Bell._EVENTS.HOVERING, () => {
      this._hovering = true;
      this.__launcher.activateIfInactive();

      // If there's already a message being force shown, do not override
      if (this.__message.shown || this.__dialog.shown) {
        this._hovering = false;
        return;
      }

      // If the message is a message and not a tip, don't show it (only show tips)
      // Messages will go away on their own
      if (this.__message.contentType === Message.TYPES.MESSAGE) {
        this._hovering = false;
        return;
      }

      new Promise<void>((resolve) => {
        // If a message is being shown
        if (this.__message.queued.length > 0) {
          return this.__message.dequeue().then((msg) => {
            this.__message.content = msg as string;
            this.__message.contentType = Message.TYPES.QUEUED;
            resolve();
          });
        } else {
          this.__message.content = decodeHtmlEntities(
            this.__message.getTipForState(),
          );
          this.__message.contentType = Message.TYPES.TIP;
          resolve();
        }
      })
        .then(() => {
          return this.__message.show();
        })
        .then(() => {
          this._hovering = false;
        })
        .catch((err) => {
          Log.error(err);
        });
    });

    OneSignal.emitter.on(Bell._EVENTS.HOVERED, () => {
      // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
      if (this.__message.contentType === Message.TYPES.MESSAGE) {
        return;
      }

      if (!this.__dialog.hidden) {
        // If the dialog is being brought up when clicking button, don't shrink
        return;
      }

      if (this._hovering) {
        this._hovering = false;
        // Hovering still being true here happens on mobile where the message could still be showing (i.e. animating)
        // when a HOVERED event fires. In other words, you tap on mobile, HOVERING fires, and then HOVERED fires
        // immediately after because of the way mobile click events work. Basically only happens if HOVERING and HOVERED
        // fire within a few milliseconds of each other
        this.__message
          .waitUntilShown()
          .then(() => delay(Message.TIMEOUT))
          .then(() => this.__message.hide())
          .then(() => {
            if (this.__launcher.wasInactive && this.__dialog.hidden) {
              this.__launcher.inactivate();
              this.__launcher.wasInactive = false;
            }
          });
      }

      if (this.__message.shown) {
        this.__message.hide().then(() => {
          if (this.__launcher.wasInactive && this.__dialog.hidden) {
            this.__launcher.inactivate();
            this.__launcher.wasInactive = false;
          }
        });
      }
    });

    OneSignal.emitter.on(
      OneSignal.EVENTS.SUBSCRIPTION_CHANGED,
      async (isSubscribed: SubscriptionChangeEvent) => {
        if (isSubscribed.current.optedIn) {
          if (this.__badge.shown && this._options.prenotify) {
            this.__badge.hide();
          }
          if (this.__dialog.notificationIcons === null) {
            const icons = await MainHelper.getNotificationIcons();
            this.__dialog.notificationIcons = icons;
          }
        }

        const permission =
          await OneSignal.context.permissionManager.getPermissionStatus();
        let bellState: BellState;
        if (isSubscribed.current.optedIn) {
          bellState = Bell._STATES.SUBSCRIBED;
        } else if (permission === 'denied') {
          bellState = Bell._STATES.BLOCKED;
        } else {
          bellState = Bell._STATES.UNSUBSCRIBED;
        }
        this._setState(bellState, this._ignoreSubscriptionState);
      },
    );

    OneSignal.emitter.on(Bell._EVENTS.STATE_CHANGED, (state) => {
      if (!this.__launcher.element) {
        // Notify button doesn't exist
        return;
      }
      if (state.to === Bell._STATES.SUBSCRIBED) {
        this.__launcher.inactivate();
      } else if (
        state.to === Bell._STATES.UNSUBSCRIBED ||
        Bell._STATES.BLOCKED
      ) {
        this.__launcher.activate();
      }
    });

    OneSignal.emitter.on(
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
        this.__launcher.selector,
        'onesignal-bell-launcher-bottom-left',
      );
    } else if (this._options.position === 'bottom-right') {
      if (container) {
        addCssClass(container, 'onesignal-bell-container-bottom-right');
      }
      addCssClass(
        this.__launcher.selector,
        'onesignal-bell-launcher-bottom-right',
      );
    } else {
      throw new Error(
        `Invalid OneSignal notify button position ${this._options.position}`,
      );
    }

    if (this._options.theme === 'default') {
      addCssClass(
        this.__launcher.selector,
        'onesignal-bell-launcher-theme-default',
      );
    } else if (this._options.theme === 'inverse') {
      addCssClass(
        this.__launcher.selector,
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
      await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing notify button because styles failed to load.');
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
      this.__launcher.selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-button"></div>',
    );
    // Insert the bell launcher badge
    addDomElement(
      this.__launcher.selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-badge"></div>',
    );
    // Insert the bell launcher message
    addDomElement(
      this.__launcher.selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-message"></div>',
    );
    addDomElement(
      this.__message.selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-message-body"></div>',
    );
    // Insert the bell launcher dialog
    addDomElement(
      this.__launcher.selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-dialog"></div>',
    );
    addDomElement(
      this.__dialog.selector,
      'beforeend',
      '<div class="onesignal-bell-launcher-dialog-body"></div>',
    );

    // Install events

    // Add visual elements
    addDomElement(this.__button.selector, 'beforeend', logoSvg);

    const isPushEnabled =
      await OneSignal.context.subscriptionManager.isPushNotificationsEnabled();
    DismissHelper.wasPromptOfTypeDismissed(DismissPrompt.Push);

    // Resize to small instead of specified size if enabled, otherwise there's a jerking motion
    // where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
    const resizeTo = isPushEnabled
      ? 'small'
      : this._options.size || DEFAULT_SIZE;
    await this.__launcher.resize(resizeTo);

    this._addDefaultClasses();

    this._applyOffsetIfSpecified();
    this._setCustomColorsIfSpecified();
    this._patchSafariSvgFilterBug();

    Log.info('Showing the notify button.');

    await (isPushEnabled ? this.__launcher.inactivate() : nothing())
      .then(() => {
        if (isPushEnabled && this.__dialog.notificationIcons === null) {
          return MainHelper.getNotificationIcons().then((icons) => {
            this.__dialog.notificationIcons = icons;
          });
        } else return nothing();
      })
      .then(() => delay(this._options.showLauncherAfter || 0))
      .then(() => {
        return this.__launcher.show();
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
          return this.__message
            .enqueue(this._options.text['message.prenotify'])
            .then(() => this.__badge.show());
        } else return nothing();
      })
      .then(() => (this._initialized = true));
  }

  _patchSafariSvgFilterBug() {
    if (getBrowserName() !== Browser.Safari) {
      const bellShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0.35));`;
      const badgeShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0));`;
      const dialogShadow = `drop-shadow(0px 2px 2px rgba(34,36,38,.15));`;
      this._graphic.setAttribute(
        'style',
        `filter: ${bellShadow}; -webkit-filter: ${bellShadow};`,
      );
      this.__badge.element.setAttribute(
        'style',
        `filter: ${badgeShadow}; -webkit-filter: ${badgeShadow};`,
      );
      this.__dialog!.element!.setAttribute(
        'style',
        `filter: ${dialogShadow}; -webkit-filter: ${dialogShadow};`,
      );
    } else {
      this.__badge.element.setAttribute('style', `display: none;`);
    }
  }

  _applyOffsetIfSpecified() {
    const offset = this._options.offset;
    if (offset) {
      const element = this.__launcher.element as HTMLElement;

      if (!element) {
        Log.error('Could not find bell dom element');
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

  private _getDialogButton() {
    return this._dialog!.element!.querySelector('button.action') as HTMLElement;
  }

  private _applyCustomColors() {
    if (!this._options.colors) return;

    const colorMappings: Record<string, (color: string) => void | string> = {
      'circle.background': (color: string) =>
        ((
          this._graphic.querySelector('.background') as HTMLElement
        ).style.cssText += `fill: ${color}`),
      'circle.foreground': (color: string) => {
        this._graphic
          .querySelectorAll('.foreground')
          .forEach(
            (el) => ((el as HTMLElement).style.cssText += `fill: ${color}`),
          );
        (this._graphic.querySelector('.stroke') as HTMLElement).style.cssText +=
          `stroke: ${color}`;
      },
      'badge.background': (color: string) =>
        (this.__badge.element.style.cssText += `background: ${color}`),
      'badge.bordercolor': (color: string) =>
        (this.__badge.element.style.cssText += `border-color: ${color}`),
      'badge.foreground': (color: string) =>
        (this.__badge.element.style.cssText += `color: ${color}`),
    };

    const dialogButton = this._getDialogButton();
    if (dialogButton) {
      dialogButton.style.cssText = '';
      colorMappings['dialog.button.background'] = (color: string) =>
        (dialogButton.style.cssText = `background: ${color}`);
      colorMappings['dialog.button.foreground'] = (color: string) =>
        (dialogButton.style.cssText = `color: ${color}`);
      colorMappings['dialog.button.background.hovering'] = (color: string) =>
        this._addCssToHead(
          'onesignal-background-hover-style',
          `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:hover { background: ${color} !important; }`,
        );
      colorMappings['dialog.button.background.active'] = (color: string) =>
        this._addCssToHead(
          'onesignal-background-active-style',
          `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:active { background: ${color} !important; }`,
        );
      colorMappings['dialog.button.background.active'] = (color: string) =>
        this._addCssToHead(
          'onesignal-background-active-style',
          `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:active { background: ${color} !important; }`,
        );
    }

    const pulseRing = this.__button.element.querySelector('.pulse-ring');
    if (pulseRing) {
      (pulseRing as HTMLElement).style.cssText = '';
      colorMappings['pulse.color'] = (color: string) =>
        ((pulseRing as HTMLElement).style.cssText = `border-color: ${color}`);
    }

    Object.entries(this._options.colors).forEach(([key, color]) => {
      const mapper = colorMappings[key as keyof typeof colorMappings];
      if (mapper) mapper(color);
    });
  }

  _setCustomColorsIfSpecified() {
    // Some common vars first
    // Reset added styles first
    (this._graphic.querySelector('.background') as HTMLElement).style.cssText =
      '';
    const foregroundElements = this._graphic.querySelectorAll('.foreground');
    for (let i = 0; i < foregroundElements.length; i++) {
      const element = foregroundElements[i] as HTMLElement;
      element.style.cssText = '';
    }
    (this._graphic.querySelector('.stroke') as HTMLElement).style.cssText = '';
    (this.__badge.element as HTMLElement).style.cssText = '';

    // Set new styles
    this._applyCustomColors();
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
      OneSignal.context.subscriptionManager.isPushNotificationsEnabled(),
      OneSignal.context.permissionManager.getPermissionStatus(),
    ])
      .then(([isEnabled, permission]) => {
        this._setState(
          isEnabled ? Bell._STATES.SUBSCRIBED : Bell._STATES.UNSUBSCRIBED,
        );
        if (permission === 'denied') {
          this._setState(Bell._STATES.BLOCKED);
        }
      })
      .catch((e) => {
        Log.error(e);
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
      OneSignalEvent.trigger(Bell._EVENTS.STATE_CHANGED, {
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
    return this.__button.element!.querySelector('svg') as SVGElement;
  }

  get __launcher() {
    if (!this._launcher) this._launcher = new Launcher(this);
    return this._launcher;
  }

  get __button() {
    if (!this._button) this._button = new Button(this);
    return this._button;
  }

  get __badge() {
    if (!this._badge) this._badge = new Badge();
    return this._badge;
  }

  get __message() {
    if (!this._message) this._message = new Message(this);
    return this._message;
  }

  get __dialog() {
    if (!this._dialog) this._dialog = new Dialog(this);
    return this._dialog;
  }

  get _subscribed() {
    return this._state === Bell._STATES.SUBSCRIBED;
  }

  get _unsubscribed() {
    return this._state === Bell._STATES.UNSUBSCRIBED;
  }

  get _blocked() {
    return this._state === Bell._STATES.BLOCKED;
  }
}
