import { ResourceLoadState } from '../../page/services/DynamicResourceLoader';
import { addCssClass } from '../helpers/dom';
import Log from '../libraries/Log';
import type { AppUserConfigCustomLinkOptions } from '../prompts/types';
import {
  CUSTOM_LINK_CSS_CLASSES,
  CUSTOM_LINK_CSS_SELECTORS,
} from '../slidedown/constants';

export class CustomLinkManager {
  private _config: AppUserConfigCustomLinkOptions | undefined;

  constructor(config?: AppUserConfigCustomLinkOptions) {
    this._config = config;
  }

  async _initialize(): Promise<void> {
    if (!this._config?.enabled) {
      return;
    }

    if (!(await this._loadSdkStyles())) {
      return;
    }

    Log._info('OneSignal: initializing customlink');
    const isPushEnabled =
      await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
    if (!this._config?.unsubscribeEnabled && isPushEnabled) {
      this._hideCustomLinkContainers();
      return;
    }
    // traditional for-loop required here to avoid layout shift
    for (let i = 0; i < this._customlinkContainerElements.length; i++) {
      await this._injectMarkup(this._customlinkContainerElements[i]);
    }
  }

  private async _injectMarkup(element: HTMLElement): Promise<void> {
    // clear contents
    element.innerHTML = '';

    await this._mountExplanationNode(element);
    await this._mountSubscriptionNode(element);
  }

  private async _mountExplanationNode(element: HTMLElement): Promise<void> {
    if (!this._config?.text) {
      Log._error(
        "CustomLink: required property 'text' is missing in the config",
      );
      return;
    }

    if (this._config.text.explanation) {
      const explanation = document.createElement('p');
      explanation.textContent = this._config.text.explanation;
      addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.resetClass);
      addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.explanationClass);

      if (this._config.size) {
        addCssClass(explanation, this._config.size);
      }

      if (
        await OneSignal._context._subscriptionManager._isPushNotificationsEnabled()
      ) {
        addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.state.subscribed);
      } else {
        addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.state.unsubscribed);
      }

      element.appendChild(explanation);
    }
  }

  private async _mountSubscriptionNode(element: HTMLElement): Promise<void> {
    if (!this._config?.text) {
      Log._error(
        "CustomLink: required property 'text' is missing in the config",
      );
      return;
    }

    if (this._config.text.subscribe) {
      const subscribeButton = document.createElement('button');
      addCssClass(subscribeButton, CUSTOM_LINK_CSS_CLASSES.resetClass);
      addCssClass(subscribeButton, CUSTOM_LINK_CSS_CLASSES.subscribeClass);

      if (this._config.size) {
        addCssClass(subscribeButton, this._config.size);
      }

      if (this._config.style) {
        addCssClass(subscribeButton, this._config.style);
      }

      if (
        await OneSignal._context._subscriptionManager._isPushNotificationsEnabled()
      ) {
        addCssClass(subscribeButton, CUSTOM_LINK_CSS_CLASSES.state.subscribed);
      } else {
        addCssClass(
          subscribeButton,
          CUSTOM_LINK_CSS_CLASSES.state.unsubscribed,
        );
      }

      this._setCustomColors(subscribeButton);
      await this._setTextFromPushStatus(subscribeButton);

      subscribeButton.addEventListener('click', async () => {
        Log._info('CustomLink: subscribe clicked');
        await this._handleClick(subscribeButton);
      });

      // Adds type="button" to the Custom Link Button.
      // This prevents this button submitting if included in a form.
      subscribeButton.setAttribute('type', 'button');

      element.appendChild(subscribeButton);
    }
  }

  private async _loadSdkStyles(): Promise<boolean> {
    const sdkStylesLoadResult =
      await OneSignal._context._dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log._debug(
        'Not initializing custom link button because styles failed to load.',
      );
      return false;
    }
    return true;
  }

  private _hideElement(element: HTMLElement): void {
    addCssClass(element, CUSTOM_LINK_CSS_CLASSES.hide);
  }

  /**
   * Used for hiding elements if "Allow unsubscribe" is on
   * @returns void
   */
  private _hideCustomLinkContainers(): void {
    this._customlinkContainerElements.forEach((element) => {
      this._hideElement(element);
    });
  }

  private async _handleClick(element: HTMLElement): Promise<void> {
    if (OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optOut();
      await this._setTextFromPushStatus(element);
    } else {
      await OneSignal.User.PushSubscription.optIn();
      // once subscribed, prevent unsubscribe by hiding customlinks
      if (!this._config?.unsubscribeEnabled) {
        this._hideCustomLinkContainers();
      }
      return;
    }
  }

  private async _setTextFromPushStatus(element: HTMLElement): Promise<void> {
    if (this._config?.text?.subscribe) {
      if (
        !(await OneSignal._context._subscriptionManager._isPushNotificationsEnabled())
      ) {
        element.textContent = this._config.text.subscribe;
      }
    }

    if (this._config?.text?.unsubscribe) {
      if (
        await OneSignal._context._subscriptionManager._isPushNotificationsEnabled()
      ) {
        element.textContent = this._config.text.unsubscribe;
      }
    }
  }

  private _setCustomColors(element: HTMLElement): void {
    if (!this._config?.color || !this._config.color.text) {
      return;
    }

    if (this._config?.style === 'button' && this._config?.color.button) {
      element.style.backgroundColor = this._config?.color.button;
      element.style.color = this._config?.color.text;
    } else if (this._config?.style === 'link') {
      element.style.color = this._config?.color.text;
    }
  }

  get _customlinkContainerElements(): HTMLElement[] {
    const containers = document.querySelectorAll<HTMLElement>(
      CUSTOM_LINK_CSS_SELECTORS.containerSelector,
    );
    return Array.prototype.slice.call(containers);
  }
}
