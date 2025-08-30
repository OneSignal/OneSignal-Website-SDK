import { ResourceLoadState } from '../../page/services/DynamicResourceLoader';
import { addCssClass } from '../helpers/dom';
import Log from '../libraries/Log';
import type { AppUserConfigCustomLinkOptions } from '../prompts/types';
import {
  CUSTOM_LINK_CSS_CLASSES,
  CUSTOM_LINK_CSS_SELECTORS,
} from '../slidedown/constants';

export class CustomLinkManager {
  private config: AppUserConfigCustomLinkOptions | undefined;

  constructor(config?: AppUserConfigCustomLinkOptions) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config?.enabled) {
      return;
    }

    if (!(await this.loadSdkStyles())) {
      return;
    }

    Log._info('OneSignal: initializing customlink');
    const isPushEnabled =
      await OneSignal.context._subscriptionManager.isPushNotificationsEnabled();
    if (!this.config?.unsubscribeEnabled && isPushEnabled) {
      this.hideCustomLinkContainers();
      return;
    }
    // traditional for-loop required here to avoid layout shift
    for (let i = 0; i < this.customlinkContainerElements.length; i++) {
      await this.injectMarkup(this.customlinkContainerElements[i]);
    }
  }

  private async injectMarkup(element: HTMLElement): Promise<void> {
    // clear contents
    element.innerHTML = '';

    await this.mountExplanationNode(element);
    await this.mountSubscriptionNode(element);
  }

  private async mountExplanationNode(element: HTMLElement): Promise<void> {
    if (!this.config?.text) {
      Log._error(
        "CustomLink: required property 'text' is missing in the config",
      );
      return;
    }

    if (this.config.text.explanation) {
      const explanation = document.createElement('p');
      explanation.textContent = this.config.text.explanation;
      addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.resetClass);
      addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.explanationClass);

      if (this.config.size) {
        addCssClass(explanation, this.config.size);
      }

      if (
        await OneSignal.context._subscriptionManager.isPushNotificationsEnabled()
      ) {
        addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.state.subscribed);
      } else {
        addCssClass(explanation, CUSTOM_LINK_CSS_CLASSES.state.unsubscribed);
      }

      element.appendChild(explanation);
    }
  }

  private async mountSubscriptionNode(element: HTMLElement): Promise<void> {
    if (!this.config?.text) {
      Log._error(
        "CustomLink: required property 'text' is missing in the config",
      );
      return;
    }

    if (this.config.text.subscribe) {
      const subscribeButton = document.createElement('button');
      addCssClass(subscribeButton, CUSTOM_LINK_CSS_CLASSES.resetClass);
      addCssClass(subscribeButton, CUSTOM_LINK_CSS_CLASSES.subscribeClass);

      if (this.config.size) {
        addCssClass(subscribeButton, this.config.size);
      }

      if (this.config.style) {
        addCssClass(subscribeButton, this.config.style);
      }

      if (
        await OneSignal.context._subscriptionManager.isPushNotificationsEnabled()
      ) {
        addCssClass(subscribeButton, CUSTOM_LINK_CSS_CLASSES.state.subscribed);
      } else {
        addCssClass(
          subscribeButton,
          CUSTOM_LINK_CSS_CLASSES.state.unsubscribed,
        );
      }

      this.setCustomColors(subscribeButton);
      await this.setTextFromPushStatus(subscribeButton);

      subscribeButton.addEventListener('click', async () => {
        Log._info('CustomLink: subscribe clicked');
        await this.handleClick(subscribeButton);
      });

      // Adds type="button" to the Custom Link Button.
      // This prevents this button submitting if included in a form.
      subscribeButton.setAttribute('type', 'button');

      element.appendChild(subscribeButton);
    }
  }

  private async loadSdkStyles(): Promise<boolean> {
    const sdkStylesLoadResult =
      await OneSignal.context._dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log._debug(
        'Not initializing custom link button because styles failed to load.',
      );
      return false;
    }
    return true;
  }

  private hideElement(element: HTMLElement): void {
    addCssClass(element, CUSTOM_LINK_CSS_CLASSES.hide);
  }

  /**
   * Used for hiding elements if "Allow unsubscribe" is on
   * @returns void
   */
  private hideCustomLinkContainers(): void {
    this.customlinkContainerElements.forEach((element) => {
      this.hideElement(element);
    });
  }

  private async handleClick(element: HTMLElement): Promise<void> {
    if (OneSignal.User.PushSubscription.optedIn) {
      await OneSignal.User.PushSubscription.optOut();
      await this.setTextFromPushStatus(element);
    } else {
      await OneSignal.User.PushSubscription.optIn();
      // once subscribed, prevent unsubscribe by hiding customlinks
      if (!this.config?.unsubscribeEnabled) {
        this.hideCustomLinkContainers();
      }
      return;
    }
  }

  private async setTextFromPushStatus(element: HTMLElement): Promise<void> {
    if (this.config?.text?.subscribe) {
      if (
        !(await OneSignal.context._subscriptionManager.isPushNotificationsEnabled())
      ) {
        element.textContent = this.config.text.subscribe;
      }
    }

    if (this.config?.text?.unsubscribe) {
      if (
        await OneSignal.context._subscriptionManager.isPushNotificationsEnabled()
      ) {
        element.textContent = this.config.text.unsubscribe;
      }
    }
  }

  private setCustomColors(element: HTMLElement): void {
    if (!this.config?.color || !this.config.color.text) {
      return;
    }

    if (this.config?.style === 'button' && this.config?.color.button) {
      element.style.backgroundColor = this.config?.color.button;
      element.style.color = this.config?.color.text;
    } else if (this.config?.style === 'link') {
      element.style.color = this.config?.color.text;
    }
  }

  get customlinkContainerElements(): HTMLElement[] {
    const containers = document.querySelectorAll<HTMLElement>(
      CUSTOM_LINK_CSS_SELECTORS.containerSelector,
    );
    return Array.prototype.slice.call(containers);
  }
}
