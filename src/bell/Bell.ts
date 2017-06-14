import * as Browser from 'bowser';
import * as log from 'loglevel';

import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import SubscriptionHelper from '../helpers/SubscriptionHelper';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import { addCssClass, addDomElement, contains, decodeHtmlEntities, delay, nothing, once, removeDomElement } from '../utils';
import Badge from './Badge';
import Button from './Button';
import Dialog from './Dialog';
import Launcher from './Launcher';
import Message from './Message';

var logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;


export default class Bell {
  public enable: boolean;
  public size: string;
  public position: string;
  public theme: string;
  public showLauncherAfter: number;
  public showBadgeAfter: number;
  public text: any;
  public prenotify: boolean;
  public showCredit: boolean;
  public colors: any;
  public offset: any;
  public options: any;
  public state: any;
  public _ignoreSubscriptionState: boolean;
  public hovering: boolean;
  public initialized: boolean;
  public _launcher: any;
  public _button: any;
  public _badge: any;
  public _message: any;
  public _dialog: any;

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
      UNINITIALIZED: 'uninitialized',
      SUBSCRIBED: 'subscribed',
      UNSUBSCRIBED: 'unsubscribed',
      BLOCKED: 'blocked'
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

  substituteText() {
    // key: 'message.action.subscribing'
    // value: 'Click <strong>{{prompt.native.grant}}</strong> to receive notifications'
    for (var key in this.text) {
      if (this.text.hasOwnProperty(key)) {
        let value = this.text[key];
        // browserName could be 'chrome' or 'firefox' or 'safari'
        let browserName = Browser.name.toLowerCase();

        // tKey: 'prompt.native.grant'  (from TEXT_SUBS)
        // tValue: { chrome: 'Allow', firefox: 'Al... }
        // zValue: 'Allow', if browserName === 'chrome'
        for (var tKey in Bell.TEXT_SUBS) {
          if (Bell.TEXT_SUBS.hasOwnProperty(tKey)) {
            let tValue = Bell.TEXT_SUBS[tKey];
            let zValue = tValue[browserName];
            if (value && contains(value, '{{')) {
              this.text[key] = value.replace(`{{${tKey}}}`, (zValue !== undefined ? zValue : tValue['default']));
            }
          }
        }
      }
    }
  }

  constructor({
    enable = false,
    size = 'medium',
    position = 'bottom-right',
    theme = 'default',
    showLauncherAfter = 10,
    showBadgeAfter = 300,
    text = {
      'tip.state.unsubscribed': 'Subscribe to notifications',
      'tip.state.subscribed': "You're subscribed to notifications",
      'tip.state.blocked': "You've blocked notifications",
      'message.prenotify': 'Click to subscribe to notifications',
      'message.action.subscribing': "Click <strong>{{prompt.native.grant}}</strong> to receive notifications",
      'message.action.subscribed': "Thanks for subscribing!",
      'message.action.resubscribed': "You're subscribed to notifications",
      'message.action.unsubscribed': "You won't receive notifications again",
      'dialog.main.title': 'Manage Site Notifications',
      'dialog.main.button.subscribe': 'SUBSCRIBE',
      'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
      'dialog.blocked.title': 'Unblock Notifications',
      'dialog.blocked.message': "Follow these instructions to allow notifications:"
    },
    prenotify = true,
    showCredit = true,
    colors = null,
    offset = null,
    launcher = null
    } = {}) {
    this.options = {
      enable: enable,
      size: size,
      position: position,
      theme: theme,
      showLauncherAfter: showLauncherAfter,
      showBadgeAfter: showBadgeAfter,
      text: text,
      prenotify: prenotify,
      showCredit: showCredit,
      colors: colors,
      offset: offset
    };

    if (!this.options.enable)
      return;

    if (!contains(['small', 'medium', 'large'], this.options.size))
      throw new Error(`Invalid size ${this.options.size} for notify button. Choose among 'small', 'medium', or 'large'.`);
    if (!contains(['bottom-left', 'bottom-right'], this.options.position))
      throw new Error(`Invalid position ${this.options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`);
    if (!contains(['default', 'inverse'], this.options.theme))
      throw new Error(`Invalid theme ${this.options.theme} for notify button. Choose either 'default', or 'inverse'.`);
    if (this.options.showLauncherAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showLauncherAfter} for showing the notify button. Choose a value above 0.`);
    if (this.options.showBadgeAfter < 0)
      throw new Error(`Invalid delay duration of ${this.options.showBadgeAfter} for showing the notify button's badge. Choose a value above 0.`);
    this.size = this.options.size;
    this.position = this.options.position;
    this.text = this.options.text;
    if (!this.text['tip.state.unsubscribed'])
      this.text['tip.state.unsubscribed'] = 'Subscribe to notifications';
    if (!this.text['tip.state.subscribed'])
      this.text['tip.state.subscribed'] = "You're subscribed to notifications";
    if (!this.text['tip.state.blocked'])
      this.text['tip.state.blocked'] = "You've blocked notifications";
    if (!this.text['message.prenotify'])
      this.text['message.prenotify'] = "Click to subscribe to notifications";
    if (!this.text['message.action.subscribed'])
      this.text['message.action.subscribed'] = "Thanks for subscribing!";
    if (!this.text['message.action.resubscribed'])
      this.text['message.action.resubscribed'] = "You're subscribed to notifications";
    if (!this.text['message.action.subscribing'])
      this.text['message.action.subscribing'] = "Click <strong>{{prompt.native.grant}}</strong> to receive notifications";
    if (!this.text['message.action.unsubscribed'])
      this.text['message.action.unsubscribed'] = "You won't receive notifications again";
    if (!this.text['dialog.main.title'])
      this.text['dialog.main.title'] = 'Manage Site Notifications';
    if (!this.text['dialog.main.button.subscribe'])
      this.text['dialog.main.button.subscribe'] = 'SUBSCRIBE';
    if (!this.text['dialog.main.button.unsubscribe'])
      this.text['dialog.main.button.unsubscribe'] = 'UNSUBSCRIBE';
    if (!this.text['dialog.blocked.title'])
      this.text['dialog.blocked.title'] = 'Unblock Notifications';
    if (!this.text['dialog.blocked.message'])
      this.text['dialog.blocked.message'] = 'Follow these instructions to allow notifications:';
    this._launcher = launcher;
    this.substituteText();
    this.state = Bell.STATES.UNINITIALIZED;
    this._ignoreSubscriptionState = false;

    // Install event hooks
    OneSignal.on(Bell.EVENTS.SUBSCRIBE_CLICK, () => {
      this.dialog.subscribeButton.disabled = true;
      this._ignoreSubscriptionState = true;
      OneSignal.setSubscription(true)
        .then(() => {
          this.dialog.subscribeButton.disabled = false;
          return this.dialog.hide();
        })
        .then(() => {
          return this.message.display(Message.TYPES.MESSAGE, this.text['message.action.resubscribed'], Message.TIMEOUT);
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

    OneSignal.on(Bell.EVENTS.UNSUBSCRIBE_CLICK, () => {
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
          return this.message.display(Message.TYPES.MESSAGE, this.text['message.action.unsubscribed'], Message.TIMEOUT);
        })
        .then(() => {
          return this.updateState();
        });
    });

    OneSignal.on(Bell.EVENTS.HOVERING, () => {
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
          return this.message.dequeue().then((msg) => {
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

    OneSignal.on(Bell.EVENTS.HOVERED, () => {
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
              this.launcher.wasInactive = null;
            }
          });
      }


      if (this.message.shown) {
        this.message.hide()
          .then(() => {
            if (this.launcher.wasInactive && this.dialog.hidden) {
              this.launcher.inactivate();
              this.launcher.wasInactive = null;
            }
          });
      }
    });

    OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async isSubscribed => {
      if (isSubscribed == true) {
        if (this.badge.shown && this.options.prenotify) {
          this.badge.hide();
        }
        if (this.dialog.notificationIcons === null) {
          const icons = await MainHelper.getNotificationIcons();
          this.dialog.notificationIcons = icons;
        }
      }

      OneSignal.getNotificationPermission(permission => {
        this.setState((isSubscribed ?
          Bell.STATES.SUBSCRIBED :
          ((permission === 'denied') ? Bell.STATES.BLOCKED : Bell.STATES.UNSUBSCRIBED)), this._ignoreSubscriptionState);
      });
    });

    OneSignal.on(Bell.EVENTS.STATE_CHANGED, (state) => {
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

    OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, () => {
      this.updateState();
    });

    this.updateState();
  }

  showDialogProcedure() {
    if (!this.dialog.shown) {
      this.dialog.show()
        .then(() => {
          once(document, 'click', (e, destroyEventListener) => {
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

  async create() {
    if (!this.options.enable)
      return;

    const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      log.debug('Not showing notify button because styles failed to load.');
      return;
    }

    // Remove any existing bell
    if (this.container) {
      removeDomElement('#onesignal-bell-container');
    }

    // Insert the bell container
    addDomElement('body', 'beforeend', '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>');
    // Insert the bell launcher
    addDomElement(this.container, 'beforeend', '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>');
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
    addDomElement(this.button.selector, 'beforeEnd', logoSvg);

    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
    const notOptedOut = await OneSignal.getSubscription();
    const doNotPrompt = await MainHelper.wasHttpsNativePromptDismissed()

    // Resize to small instead of specified size if enabled, otherwise there's a jerking motion where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
    let resizeTo = (isPushEnabled ? 'small' : this.options.size);
    // Add default classes
    await this.launcher.resize(resizeTo);
    if (this.options.position === 'bottom-left') {
      addCssClass(this.container, 'onesignal-bell-container-bottom-left')
      addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-left')
    }
    else if (this.options.position === 'bottom-right') {
      addCssClass(this.container, 'onesignal-bell-container-bottom-right')
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

    this.applyOffsetIfSpecified();
    this.setCustomColorsIfSpecified();
    this.patchSafariSvgFilterBug();

    log.info('Showing the notify button.');

    await (isPushEnabled ? this.launcher.inactivate() : nothing())
      .then(() => OneSignal.getSubscription())
      .then(isNotOptedOut => {
        if ((isPushEnabled || !isNotOptedOut) && this.dialog.notificationIcons === null) {
          return MainHelper.getNotificationIcons().then((icons) => {
            this.dialog.notificationIcons = icons;
          });
        } else return nothing();
      })
      .then(() => delay(this.options.showLauncherAfter))
      .then(() => {
        if (SubscriptionHelper.isUsingSubscriptionWorkaround() &&
          notOptedOut &&
          doNotPrompt !== true && !isPushEnabled &&
          (OneSignal.config.userConfig.autoRegister === true) && !MainHelper.isHttpPromptAlreadyShown() && !MainHelper.isUsingHttpPermissionRequest()) {
          log.debug('Not showing notify button because popover will be shown.');
          return nothing();
        } else {
          return this.launcher.show();
        }
      })
      .then(() => {
        return delay(this.options.showBadgeAfter);
      })
      .then(() => {
        if (this.options.prenotify && !isPushEnabled && OneSignal._isNewVisitor) {
          return this.message.enqueue(this.text['message.prenotify'])
                     .then(() => this.badge.show());
        }
        else return nothing();
      })
      .then(() => this.initialized = true);
  }

  patchSafariSvgFilterBug() {
    if (!(Browser.safari && Number(Browser.version) >= 9.1)) {
      let bellShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0.35));`;
      let badgeShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0));`;
      let dialogShadow = `drop-shadow(0px 2px 2px rgba(34,36,38,.15));`;
      this.graphic.setAttribute('style', `filter: ${bellShadow}; -webkit-filter: ${bellShadow};`);
      this.badge.element.setAttribute('style', `filter: ${badgeShadow}; -webkit-filter: ${badgeShadow};`);
      this.dialog.element.setAttribute('style', `filter: ${dialogShadow}; -webkit-filter: ${dialogShadow};`);
    }
    if (Browser.safari) {
      this.badge.element.setAttribute('style', `display: none;`);
    }
  }

  applyOffsetIfSpecified() {
    let offset = this.options.offset;
    if (offset) {
      // Reset styles first
      this.launcher.element.style.cssText = '';

      if (offset.bottom) {
        this.launcher.element.style.cssText += `bottom: ${offset.bottom};`;
      }

      if (this.options.position === 'bottom-right') {
        if (offset.right) {
          this.launcher.element.style.cssText += `right: ${offset.right};`;
        }
      }
      else if (this.options.position === 'bottom-left') {
        if (offset.left) {
          this.launcher.element.style.cssText += `left: ${offset.left};`;
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

  addCssToHead(id, css) {
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
      OneSignal.isPushNotificationsEnabled(),
      OneSignal.getNotificationPermission()
    ])
    .then(([isEnabled, permission]) => {
      this.setState(isEnabled ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
      if (permission as any === 'denied') {
        this.setState(Bell.STATES.BLOCKED);
      }
    });
  }

  /**
   * Updates the current state to the specified new state.
   * @param newState One of ['subscribed', 'unsubscribed'].
   */
  setState(newState, silent = false) {
    let lastState = this.state;
    this.state = newState;
    if (lastState !== newState && !silent) {
      Event.trigger(Bell.EVENTS.STATE_CHANGED, {from: lastState, to: newState});
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
