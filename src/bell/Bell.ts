import bowser from 'bowser';
import { AppUserConfigNotifyButton, BellSize, BellPosition, BellText } from "../models/Prompts";
import { NotificationPermission } from "../models/NotificationPermission";
import OneSignalEvent from '../Event';
import MainHelper from '../helpers/MainHelper';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import {
  addCssClass, addDomElement, contains, decodeHtmlEntities, delay, nothing, once,
  removeDomElement, isUsingSubscriptionWorkaround
} from '../utils';
import Badge from './Badge';
import Button from './Button';
import Dialog from './Dialog';
import Launcher from './Launcher';
import Message from './Message';
import Log from '../libraries/Log';
import OneSignal from "../OneSignal";

var logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;

type BellState = 'uninitialized' | 'subscribed' | 'unsubscribed' | 'blocked';

export default class Bell {
  public options: AppUserConfigNotifyButton;
  public state: BellState = Bell.STATES.UNINITIALIZED;
  public _ignoreSubscriptionState: boolean = false;
  public hovering: boolean = false;
  public initialized: boolean = false;
  public _launcher: Launcher | undefined;
  public _button: any;
  public _badge: any;
  public _message: any;
  public _dialog: any;

  private DEFAULT_SIZE: BellSize = "medium";
  private DEFAULT_POSITION: BellPosition = "bottom-right";
  private DEFAULT_THEME: string = "default";

  static get EVENTS() {
    return {
      STATE_CHANGED: 'notifyButtonStateChange',
      LAUNCHER_CLICK: 'notifyButtonLauncherClick',
      BELL_CLICK: 'notifyButtonButtonClick',
      SUBSCRIBE_CLICK: 'notifyButtonSubscribeClick',
      UNSUBSCRIBE_CLICK: 'notifyButtonUnsubscribeClick',
      HOVERING: 'notifyButtonHovering',
      HOVERED: 'notifyButtonHover'
    };
  }

  static get STATES() {
    return {
      UNINITIALIZED: 'uninitialized' as BellState,
      SUBSCRIBED: 'subscribed' as BellState,
      UNSUBSCRIBED: 'unsubscribed' as BellState,
      BLOCKED: 'blocked' as BellState,
    };
  }

  static get TEXT_SUBS() {
    return {
      'prompt.native.grant': {
        default: 'Allow',
        chrome: 'Allow',
        firefox: 'Always Receive Notifications',
        safari: 'Allow'
      }
    }
  }

  constructor(config: Partial<AppUserConfigNotifyButton>, launcher?: Launcher) {
    this.options = {
      enable: config.enable || false,
      size: config.size || this.DEFAULT_SIZE,
      position: config.position || this.DEFAULT_POSITION,
      theme: config.theme || this.DEFAULT_THEME,
      showLauncherAfter: config.showLauncherAfter || 10,
      showBadgeAfter: config.showBadgeAfter || 300,
      text: this.setDefaultTextOptions(config.text || {}),
      prenotify: config.prenotify,
      showCredit: config.showCredit,
      colors: config.colors,
      offset: config.offset,
    };

    if (launcher) {
      this._launcher = launcher;
    }

    if (!this.options.enable)
      return;

    this.validateOptions(this.options);
    this.state = Bell.STATES.UNINITIALIZED;
    this._ignoreSubscriptionState = false;

    this.installEventHooks();
    this.updateState();
  }

  showDialogProcedure() {
    if (!this.dialog.shown) {
      this.dialog.show()
        .then(() => {
          once(document, 'click', (e: Event, destroyEventListener: Function) => {
            let wasDialogClicked = this.dialog.element.contains(e.target);
            if (wasDialogClicked) {
            } else {
              destroyEventListener();
              if (this.dialog.shown) {
                this.dialog.hide()
                  .then(() => {
                    this.launcher.inactivateIfWasInactive();
                  });
              }
            }
          }, true);
        });
    }
  }

  private validateOptions(options: AppUserConfigNotifyButton) {
    if (!options.size || !contains(['small', 'medium', 'large'], options.size))
      throw new Error(`Invalid size ${options.size} for notify button. Choose among 'small', 'medium', or 'large'.`);
    if (!options.position || !contains(['bottom-left', 'bottom-right'], options.position))
      throw new Error(`Invalid position ${options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`);
    if (!options.theme || !contains(['default', 'inverse'], options.theme))
      throw new Error(`Invalid theme ${options.theme} for notify button. Choose either 'default', or 'inverse'.`);
    if (!options.showLauncherAfter || options.showLauncherAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showLauncherAfter} for showing the notify button. Choose a value above 0.`);
    if (!options.showBadgeAfter || options.showBadgeAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showBadgeAfter} for showing the notify button's badge. Choose a value above 0.`);
  }

  private setDefaultTextOptions(text: Partial<BellText>): BellText {
    const finalText: BellText = {
      'tip.state.unsubscribed': text['tip.state.unsubscribed'] || 'Subscribe to notifications',
      'tip.state.subscribed': text['tip.state.subscribed'] || "You're subscribed to notifications",
      'tip.state.blocked': text['tip.state.blocked'] || "You've blocked notifications",
      'message.prenotify': text['message.prenotify'] || "Click to subscribe to notifications",
      'message.action.subscribed': text['message.action.subscribed'] || "Thanks for subscribing!",
      'message.action.resubscribed': text['message.action.resubscribed'] || "You're subscribed to notifications",
      'message.action.subscribing':
        text['message.action.subscribing'] || "Click <strong>{{prompt.native.grant}}</strong> to receive notifications",
      'message.action.unsubscribed': text['message.action.unsubscribed'] || "You won't receive notifications again",
      'dialog.main.title': text['dialog.main.title'] || 'Manage Site Notifications',
      'dialog.main.button.subscribe': text['dialog.main.button.subscribe'] || 'SUBSCRIBE',
      'dialog.main.button.unsubscribe': text['dialog.main.button.unsubscribe'] || 'UNSUBSCRIBE',
      'dialog.blocked.title': text['dialog.blocked.title'] || 'Unblock Notifications',
      'dialog.blocked.message': text['dialog.blocked.message'] || 'Follow these instructions to allow notifications:',
    }
    return finalText;
  }

  private installEventHooks() {
    // Install event hooks
    OneSignal.emitter.on(Bell.EVENTS.SUBSCRIBE_CLICK, () => {
      this.dialog.subscribeButton.disabled = true;
      this._ignoreSubscriptionState = true;
      OneSignal.setSubscription(true)
        .then(() => {
          this.dialog.subscribeButton.disabled = false;
          return this.dialog.hide();
        })
        .then(() => {
          return this.message.display(
            Message.TYPES.MESSAGE, this.options.text['message.action.resubscribed'], Message.TIMEOUT);
        })
        .then(() => {
          this._ignoreSubscriptionState = false;
          this.launcher.clearIfWasInactive();
          return this.launcher.inactivate();
        })
        .then(() => {
          return this.updateState();
        });
    });

    OneSignal.emitter.on(Bell.EVENTS.UNSUBSCRIBE_CLICK, () => {
      this.dialog.unsubscribeButton.disabled = true;
      OneSignal.setSubscription(false)
        .then(() => {
          this.dialog.unsubscribeButton.disabled = false;
          return this.dialog.hide();
        })
        .then(() => {
          this.launcher.clearIfWasInactive();
          return this.launcher.activate();
        })
        .then(() => {
          return this.message.display(
            Message.TYPES.MESSAGE, this.options.text['message.action.unsubscribed'], Message.TIMEOUT);
        })
        .then(() => {
          return this.updateState();
        });
    });

    OneSignal.emitter.on(Bell.EVENTS.HOVERING, () => {
      this.hovering = true;
      this.launcher.activateIfInactive();

      // If there's already a message being force shown, do not override
      if (this.message.shown || this.dialog.shown) {
        this.hovering = false;
        return;
      }

      // If the message is a message and not a tip, don't show it (only show tips)
      // Messages will go away on their own
      if (this.message.contentType === Message.TYPES.MESSAGE) {
        this.hovering = false;
        return;
      }

      new Promise(resolve => {
        // If a message is being shown
        if (this.message.queued.length > 0) {
          return this.message.dequeue().then((msg: any) => {
            this.message.content = msg;
            this.message.contentType = Message.TYPES.QUEUED;
            resolve();
          });
        } else {
          this.message.content = decodeHtmlEntities(this.message.getTipForState());
          this.message.contentType = Message.TYPES.TIP;
          resolve();
        }
      }).then(() => {
          return this.message.show();
        })
        .then(() => {
          this.hovering = false;
        })
    });

    OneSignal.emitter.on(Bell.EVENTS.HOVERED, () => {
      // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
      if (this.message.contentType === Message.TYPES.MESSAGE) {
        return;
      }

      if (!this.dialog.hidden) {
        // If the dialog is being brought up when clicking button, don't shrink
        return;
      }

      if (this.hovering) {
        this.hovering = false;
        // Hovering still being true here happens on mobile where the message could still be showing (i.e. animating) when a HOVERED event fires
        // In other words, you tap on mobile, HOVERING fires, and then HOVERED fires immediately after because of the way mobile click events work
        // Basically only happens if HOVERING and HOVERED fire within a few milliseconds of each other
        this.message.waitUntilShown()
          .then(() => delay(Message.TIMEOUT))
          .then(() => this.message.hide())
          .then(() => {
            if (this.launcher.wasInactive && this.dialog.hidden) {
              this.launcher.inactivate();
              this.launcher.wasInactive = false;
            }
          });
      }


      if (this.message.shown) {
        this.message.hide()
          .then(() => {
            if (this.launcher.wasInactive && this.dialog.hidden) {
              this.launcher.inactivate();
              this.launcher.wasInactive = false;
            }
          });
      }
    });

    OneSignal.emitter.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async isSubscribed => {
      if (isSubscribed == true) {
        if (this.badge.shown && this.options.prenotify) {
          this.badge.hide();
        }
        if (this.dialog.notificationIcons === null) {
          const icons = await MainHelper.getNotificationIcons();
          this.dialog.notificationIcons = icons;
        }
      }

      OneSignal.getNotificationPermission((permission: NotificationPermission) => {
        let bellState: BellState;
        if (isSubscribed) {
          bellState = Bell.STATES.SUBSCRIBED;
        } else if (permission === NotificationPermission.Denied) {
          bellState = Bell.STATES.BLOCKED;
        } else {
          bellState = Bell.STATES.UNSUBSCRIBED
        }
        this.setState(bellState, this._ignoreSubscriptionState);
      });
    });

    OneSignal.emitter.on(Bell.EVENTS.STATE_CHANGED, (state) => {
      if (!this.launcher.element) {
        // Notify button doesn't exist
        return;
      }
      if (state.to === Bell.STATES.SUBSCRIBED) {
        this.launcher.inactivate();
      } else if (state.to === Bell.STATES.UNSUBSCRIBED ||
                              Bell.STATES.BLOCKED) {
        this.launcher.activate();
      }
    });

    OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, () => {
      this.updateState();
    });

  }

  private addDefaultClasses() {
    // Add default classes
    const container = this.container;
    if (this.options.position === 'bottom-left') {
      if (container) {
        addCssClass(container, 'onesignal-bell-container-bottom-left');
      }
      addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-left');
    }
    else if (this.options.position === 'bottom-right') {
      if (container) {
        addCssClass(container, 'onesignal-bell-container-bottom-right');
      }
      addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-right')
    }
    else {
      throw new Error('Invalid OneSignal notify button position ' + this.options.position);
    }

    if (this.options.theme === 'default') {
      addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-default')
    }
    else if (this.options.theme === 'inverse') {
      addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-inverse')
    }
    else {
      throw new Error('Invalid OneSignal notify button theme ' + this.options.theme);
    }
  }

  async create() {
    if (!this.options.enable)
      return;

    const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing notify button because styles failed to load.');
      return;
    }

    // Remove any existing bell
    if (this.container) {
      removeDomElement('#onesignal-bell-container');
    }

    // Insert the bell container
    addDomElement('body', 'beforeend', '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>');
    if (this.container) {
      // Insert the bell launcher
      addDomElement(this.container, 'beforeend', '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>');
    }

    // Insert the bell launcher button
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-button"></div>');
    // Insert the bell launcher badge
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-badge"></div>');
    // Insert the bell launcher message
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-message"></div>');
    addDomElement(this.message.selector, 'beforeend', '<div class="onesignal-bell-launcher-message-body"></div>');
    // Insert the bell launcher dialog
    addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog"></div>');
    addDomElement(this.dialog.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog-body"></div>');

    // Install events

    // Add visual elements
    addDomElement(this.button.selector, 'beforeend', logoSvg);

    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
    const notOptedOut = await OneSignal.getSubscription();
    const doNotPrompt = await MainHelper.wasHttpsNativePromptDismissed()

    // Resize to small instead of specified size if enabled, otherwise there's a jerking motion where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
    let resizeTo = (isPushEnabled ? 'small' : (this.options.size || this.DEFAULT_SIZE));
    await this.launcher.resize(resizeTo);

    this.addDefaultClasses();

    this.applyOffsetIfSpecified();
    this.setCustomColorsIfSpecified();
    this.patchSafariSvgFilterBug();

    Log.info('Showing the notify button.');

    await (isPushEnabled ? this.launcher.inactivate() : nothing())
      .then(() => OneSignal.getSubscription())
      .then((isNotOptedOut: boolean) => {
        if ((isPushEnabled || !isNotOptedOut) && this.dialog.notificationIcons === null) {
          return MainHelper.getNotificationIcons().then((icons) => {
            this.dialog.notificationIcons = icons;
          });
        } else return nothing();
      })
      .then(() => delay(this.options.showLauncherAfter || 0))
      .then(() => {
        if (isUsingSubscriptionWorkaround() &&
          notOptedOut &&
          doNotPrompt !== true && !isPushEnabled &&
          (OneSignal.config.userConfig.promptOptions.autoPrompt === true) &&
          !MainHelper.isHttpPromptAlreadyShown()
        ) {
          Log.debug('Not showing notify button because slidedown will be shown.');
          return nothing();
        } else {
          return this.launcher.show();
        }
      })
      .then(() => {
        return delay(this.options.showBadgeAfter || 0);
      })
      .then(() => {
        if (this.options.prenotify && !isPushEnabled && OneSignal._isNewVisitor) {
          return this.message.enqueue(this.options.text['message.prenotify'])
                     .then(() => this.badge.show());
        }
        else return nothing();
      })
      .then(() => this.initialized = true);
  }

  patchSafariSvgFilterBug() {
    if (!(bowser.safari && Number(bowser.version) >= 9.1)) {
      let bellShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0.35));`;
      let badgeShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0));`;
      let dialogShadow = `drop-shadow(0px 2px 2px rgba(34,36,38,.15));`;
      this.graphic.setAttribute('style', `filter: ${bellShadow}; -webkit-filter: ${bellShadow};`);
      this.badge.element.setAttribute('style', `filter: ${badgeShadow}; -webkit-filter: ${badgeShadow};`);
      this.dialog.element.setAttribute('style', `filter: ${dialogShadow}; -webkit-filter: ${dialogShadow};`);
    }
    if (bowser.safari) {
      this.badge.element.setAttribute('style', `display: none;`);
    }
  }

  applyOffsetIfSpecified() {
    let offset = this.options.offset;
    if (offset) {
      const element = this.launcher.element as HTMLElement;

      if (!element) {
        Log.error("Could not find bell dom element");
        return;
      }
      // Reset styles first
      element.style.cssText = '';

      if (offset.bottom) {
        element.style.cssText += `bottom: ${offset.bottom};`;
      }

      if (this.options.position === 'bottom-right') {
        if (offset.right) {
          element.style.cssText += `right: ${offset.right};`;
        }
      }
      else if (this.options.position === 'bottom-left') {
        if (offset.left) {
          element.style.cssText += `left: ${offset.left};`;
        }
      }
    }
  }

  setCustomColorsIfSpecified() {
    // Some common vars first
    let dialogButton = this.dialog.element.querySelector('button.action');
    let pulseRing = this.button.element.querySelector('.pulse-ring');
    // Reset added styles first
    this.graphic.querySelector('.background').style.cssText = '';
    let foregroundElements = this.graphic.querySelectorAll('.foreground');
    for (let i = 0; i < foregroundElements.length; i++) {
      let element = foregroundElements[i];
      element.style.cssText = '';
    }
    this.graphic.querySelector('.stroke').style.cssText = '';
    this.badge.element.style.cssText = '';
    if (dialogButton) {
      dialogButton.style.cssText = '';
      dialogButton.style.cssText = '';
    }
    if (pulseRing) {
      pulseRing.style.cssText = '';
    }

    // Set new styles
    if (this.options.colors) {
      let colors = this.options.colors;
      if (colors['circle.background']) {
        this.graphic.querySelector('.background').style.cssText += `fill: ${colors['circle.background']}`;
      }
      if (colors['circle.foreground']) {
        let foregroundElements = this.graphic.querySelectorAll('.foreground');
        for (let i = 0; i < foregroundElements.length; i++) {
          let element = foregroundElements[i];
          element.style.cssText += `fill: ${colors['circle.foreground']}`;
        }
        this.graphic.querySelector('.stroke').style.cssText += `stroke: ${colors['circle.foreground']}`;
      }
      if (colors['badge.background']) {
        this.badge.element.style.cssText += `background: ${colors['badge.background']}`;
      }
      if (colors['badge.bordercolor']) {
        this.badge.element.style.cssText += `border-color: ${colors['badge.bordercolor']}`;
      }
      if (colors['badge.foreground']) {
        this.badge.element.style.cssText += `color: ${colors['badge.foreground']}`;
      }
      if (dialogButton) {
        if (colors['dialog.button.background']) {
          this.dialog.element.querySelector('button.action').style.cssText += `background: ${colors['dialog.button.background']}`;
        }
        if (colors['dialog.button.foreground']) {
          this.dialog.element.querySelector('button.action').style.cssText += `color: ${colors['dialog.button.foreground']}`;
        }
        if (colors['dialog.button.background.hovering']) {
          this.addCssToHead('onesignal-background-hover-style', `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:hover { background: ${colors['dialog.button.background.hovering']} !important; }`);
        }
        if (colors['dialog.button.background.active']) {
          this.addCssToHead('onesignal-background-active-style', `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:active { background: ${colors['dialog.button.background.active']} !important; }`);
        }
      }
      if (pulseRing) {
        if (colors['pulse.color']) {
          this.button.element.querySelector('.pulse-ring').style.cssText = `border-color: ${colors['pulse.color']}`;
        }
      }
    }
  }

  addCssToHead(id: string, css: string) {
    let existingStyleDom = document.getElementById(id);
    if (existingStyleDom)
      return;
    let styleDom = document.createElement('style');
    styleDom.id = id;
    styleDom.type = 'text/css';
    styleDom.appendChild(document.createTextNode(css));
    document.head.appendChild(styleDom);
  }

  /**
   * Updates the current state to the correct new current state. Returns a promise.
   */
  updateState() {
    Promise.all([
      OneSignal.privateIsPushNotificationsEnabled(),
      OneSignal.privateGetNotificationPermission()
    ])
    .then(([isEnabled, permission]) => {
      this.setState(isEnabled ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
      if (permission === NotificationPermission.Denied) {
        this.setState(Bell.STATES.BLOCKED);
      }
    });
  }

  /**
   * Updates the current state to the specified new state.
   * @param newState One of ['subscribed', 'unsubscribed'].
   */
  setState(newState: BellState, silent = false) {
    let lastState = this.state;
    this.state = newState;
    if (lastState !== newState && !silent) {
      OneSignalEvent.trigger(Bell.EVENTS.STATE_CHANGED, {from: lastState, to: newState});
      // Update anything that should be changed here in the new state
    }

    // Update anything that should be reset to the same state
  }

  get container() {
    return document.querySelector('#onesignal-bell-container');
  }

  get graphic() {
    return this.button.element.querySelector('svg');
  }

  get launcher() {
    if (!this._launcher)
      this._launcher = new Launcher(this);
    return this._launcher;
  }

  get button() {
    if (!this._button)
      this._button = new Button(this);
    return this._button;
  }

  get badge() {
    if (!this._badge)
      this._badge = new Badge();
    return this._badge;
  }

  get message() {
    if (!this._message)
      this._message = new Message(this);
    return this._message;
  }

  get dialog() {
    if (!this._dialog)
      this._dialog = new Dialog(this);
    return this._dialog;
  }

  get subscribed() {
    return this.state === Bell.STATES.SUBSCRIBED;
  }

  get unsubscribed() {
    return this.state === Bell.STATES.UNSUBSCRIBED;
  }

  get blocked() {
    return this.state === Bell.STATES.BLOCKED;
  }
}
