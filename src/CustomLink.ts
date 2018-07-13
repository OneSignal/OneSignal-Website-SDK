import { hasCssClass, addCssClass, removeCssClass, isUsingSubscriptionWorkaround } from "./utils";
import { AppUserConfigCustomLinkOptions } from "./models/AppConfig";
import { ResourceLoadState } from "./services/DynamicResourceLoader";
import OneSignal from "./OneSignal";
import Log from "./libraries/Log";

export class CustomLink {
  public static readonly initializedAttribute = "data-cl-initialized";

  public static readonly containerClass = "onesignal-customlink-container";
  public static readonly containerSelector = `.${CustomLink.containerClass}`;
  public static readonly subscribeClass = "onesignal-customlink-subscribe";
  public static readonly subscribeSelector = `.${CustomLink.subscribeClass}`;
  public static readonly unsubscribeClass = "onesignal-customlink-unsubscribe";
  public static readonly unsubscribeSelector = `.${CustomLink.unsubscribeClass}`;
  public static readonly explanationClass = "onesignal-customlink-explanation";
  public static readonly explanationSelector = `.${CustomLink.explanationClass}`;
  public static readonly resetClass = "onesignal-reset";

  public static async initialize(config: AppUserConfigCustomLinkOptions | undefined): Promise<void> {
    if (!config || !config.enabled) {
      return;
    }

    Log.info("Inititalize CustomLink");
    const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
        Log.debug('Not initializing custom link button because styles failed to load.');
        return;
    }
    
    const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
    containerElements.forEach((element: HTMLElement) => {
      if (!element.hasAttribute(CustomLink.initializedAttribute)) {
        CustomLink.injectMarkup(element, config);
      }
    });

    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();

    const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
    subscribeElements.forEach((element: HTMLElement) =>
      CustomLink.initSubscribeElement(element, config, isPushEnabled));

    const unsubscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.unsubscribeSelector);
    unsubscribeElements.forEach((element: HTMLElement) => 
      CustomLink.initUnsubscribeElement(element, config, isPushEnabled));

    const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
    explanationElements.forEach((element: HTMLElement) => 
      CustomLink.initExplanationElement(element, config, isPushEnabled));
  }

  private static injectMarkup(container: HTMLElement,
    config: AppUserConfigCustomLinkOptions,): void {
    if (!config.text) {
      Log.error("CustomLink: required property 'text' is missing in the config");
      return;
    }

    // Clearing out the contents of the container first
    container.innerHTML = '';

    if (config.text.explanation) {
      const explanation = document.createElement("p");
      addCssClass(explanation, CustomLink.explanationClass);
      container.appendChild(explanation);
    }

    if (config.text.subscribe) {
      const subscribe = document.createElement("button");
      addCssClass(subscribe, CustomLink.subscribeClass);
      container.appendChild(subscribe);
    }

    if (config.unsubscribeEnabled && config.text.unsubscribe) {
      const unsubscribe = document.createElement("button");
      addCssClass(unsubscribe, CustomLink.unsubscribeClass);
      container.appendChild(unsubscribe);
    }

    container.setAttribute(CustomLink.initializedAttribute, "1");
  }

  private static initSubscribeElement(element: HTMLElement,
    config: AppUserConfigCustomLinkOptions, isPushEnabled: boolean): void {
    if (config.text && config.text.subscribe) {
      element.textContent = config.text.subscribe;
    }
    CustomLink.setResetClass(element);
    CustomLink.setStateClass(element, isPushEnabled);
    if (config.style) {
      CustomLink.setStyleClass(element, config);
    }
    if (config.size) {
      CustomLink.setSizeClass(element, config);
    }
    
    CustomLink.setSizeClass(element, config);
    CustomLink.setCustomColors(element, config);

    const hasEvent = !!element.getAttribute(CustomLink.initializedAttribute);
    if (!hasEvent) {
      element.addEventListener("click", async () => {
        Log.info("CustomLink: subscribe clicked");
        if (isUsingSubscriptionWorkaround()) {
          // Show the HTTP popup so users can re-allow notifications
          OneSignal.registerForPushNotifications();
        } else {
          const subscriptionState: PushSubscriptionState =
            await OneSignal.context.subscriptionManager.getSubscriptionState();
          if (!subscriptionState.subscribed) {
            OneSignal.registerForPushNotifications();
            return;
          }
          if (subscriptionState.optedOut) {
            OneSignal.setSubscription(true);
          }
        }
      });
      element.setAttribute(CustomLink.initializedAttribute, "1");
    }
  }

  private static initUnsubscribeElement(element: HTMLElement,
    config: AppUserConfigCustomLinkOptions, isPushEnabled: boolean): void {
      if (config.text && config.text.unsubscribe) {
        element.textContent = config.text.unsubscribe;
      }
      CustomLink.setResetClass(element);
      CustomLink.setStateClass(element, isPushEnabled);
      CustomLink.setStyleClass(element, config);
      CustomLink.setSizeClass(element, config);
      CustomLink.setCustomColors(element, config);

      const hasEvent = !!element.getAttribute(CustomLink.initializedAttribute);
      if (!hasEvent) {
        element.addEventListener("click", async () => {
          Log.info("CustomLink: unsubscribe clicked");
          const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
          if (isPushEnabled) {
            await OneSignal.setSubscription(false);
          }
        });
        element.setAttribute(CustomLink.initializedAttribute, "1");
      }
  }

  private static initExplanationElement(element: HTMLElement,
    config: AppUserConfigCustomLinkOptions, isPushEnabled: boolean): void {
      if (config.text && config.text.explanation) {
        element.textContent = config.text.explanation;
      }
      CustomLink.setResetClass(element);
      CustomLink.setStateClass(element, isPushEnabled);
      CustomLink.setSizeClass(element, config);
  }

  private static setCustomColors(element: HTMLElement, config: AppUserConfigCustomLinkOptions): void {
    if (config.style === "button" && config.color && config.color.button && config.color.text) {
      element.style.backgroundColor = config.color.button;
      element.style.color = config.color.text;
    } else if (config.style === "link" && config.color && config.color.text) {
      element.style.color = config.color.text;
    }
  }

  private static setStateClass(element: HTMLElement, subscribed: boolean): void {
    const oldClassName = subscribed ? "state-unsubscribed" : "state-subscribed";
    const newClassName = subscribed ? "state-subscribed" : "state-unsubscribed";

    if (hasCssClass(element, oldClassName)) {
      removeCssClass(element, oldClassName);
    }

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setStyleClass(element: HTMLElement, config: AppUserConfigCustomLinkOptions): void {
    if (!config || !config.style) {
      return
    }
    const newClassName = config.style;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setSizeClass(element: HTMLElement, config: AppUserConfigCustomLinkOptions): void {
    if (!config || !config.size) {
      return;
    }
    const newClassName = config.size;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setResetClass(element: HTMLElement) {
    const newClassName = CustomLink.resetClass;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }
}

export default CustomLink;
