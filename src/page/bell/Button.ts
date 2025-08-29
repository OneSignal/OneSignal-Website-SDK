import { addDomElement, removeDomElement } from 'src/shared/helpers/dom';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import LimitStore from 'src/shared/services/LimitStore';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import AnimatedElement from './AnimatedElement';
import Bell from './Bell';
import Message from './Message';

export default class Button extends AnimatedElement {
  public events: any;
  public bell: Bell;
  private _isHandlingClick = false;

  constructor(bell: Bell) {
    super(
      '.onesignal-bell-launcher-button',
      undefined,
      'onesignal-bell-launcher-button-active',
      undefined,
    );

    this.bell = bell;
    this.events = {
      mouse: 'bell.launcher.button.mouse',
    };

    const element = this.element;
    if (element) {
      element.addEventListener(
        'touchstart',
        () => {
          this.onHovering();
          this.onTap();
        },
        { passive: true },
      );

      element.addEventListener('mouseenter', () => {
        this.onHovering();
      });

      element.addEventListener('mouseleave', () => {
        this.onHovered();
      });
      element.addEventListener(
        'touchmove',
        () => {
          this.onHovered();
        },
        { passive: true },
      );

      element.addEventListener('mousedown', () => {
        this.onTap();
      });

      element.addEventListener('mouseup', () => {
        this.onEndTap();
      });

      element.addEventListener('click', () => {
        this.onClick();
      });
    }
  }

  onHovering() {
    if (
      LimitStore.isEmpty(this.events.mouse) ||
      LimitStore.getLast(this.events.mouse) === 'out'
    ) {
      OneSignalEvent.trigger('notifyButtonHovering');
    }
    LimitStore.put(this.events.mouse, 'over');
  }

  onHovered() {
    LimitStore.put(this.events.mouse, 'out');
    OneSignalEvent.trigger('notifyButtonHover');
  }

  onTap() {
    this.pulse();
    this.activate();
    this.bell.__badge.activate();
  }

  onEndTap() {
    this.inactivate();
    this.bell.__badge.inactivate();
  }

  async onClick() {
    // Prevent concurrent clicks (fixes GitHub issue #409)
    if (this._isHandlingClick) {
      return;
    }
    this._isHandlingClick = true;

    try {
      OneSignalEvent.trigger('notifyButtonButtonClick');
      OneSignalEvent.trigger('notifyButtonLauncherClick');

      if (
        this.bell.__message.shown &&
        this.bell.__message.contentType == Message.TYPES.MESSAGE
      ) {
        // A message is being shown, it'll disappear soon
        return;
      }

      const optedOut = LimitStore.getLast<boolean>('subscription.optedOut');

      // Handle resubscription case
      if (this.bell._unsubscribed && !optedOut) {
        registerForPushNotifications();
        this.bell._ignoreSubscriptionState = true;
        OneSignal.emitter.once('change', async () => {
          try {
            await this.bell.__message.display(
              Message.TYPES.MESSAGE,
              this.bell._options.text['message.action.subscribed'],
              Message.TIMEOUT,
            );
            this.bell._ignoreSubscriptionState = false;
            await this.bell.__launcher.inactivate();
          } catch (error) {
            this.bell._ignoreSubscriptionState = false;
            throw error;
          }
        });
        return;
      }

      // Handle dialog toggle for all other cases
      if (
        this.bell._unsubscribed ||
        this.bell._subscribed ||
        this.bell._blocked
      ) {
        await this.bell.__launcher.activateIfInactive();
        await this.toggleDialog();
      }

      await this.bell.__message.hide();
    } finally {
      this._isHandlingClick = false;
    }
  }

  private async toggleDialog() {
    if (this.bell.__dialog.shown) {
      // Close dialog if already open (toggle behavior)
      await this.bell.__dialog.hide();
      await this.bell.__launcher.inactivateIfWasInactive();
    } else {
      await this.bell._showDialogProcedure();
    }
  }

  pulse() {
    removeDomElement('.pulse-ring');
    if (this.element) {
      addDomElement(
        this.element,
        'beforeend',
        '<div class="pulse-ring"></div>',
      );
    }
    this.bell._setCustomColorsIfSpecified();
  }
}
