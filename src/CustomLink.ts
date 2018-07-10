import { hasCssClass, addCssClass, removeCssClass, isUsingSubscriptionWorkaround } from "./utils";
import { AppUserConfigCustomLinkOptions } from "./models/AppConfig";
import { ResourceLoadState } from "./services/DynamicResourceLoader";
import OneSignal from "./OneSignal";
import Log from "./libraries/Log";

export class CustomLink {
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
    
    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();

    const onClickAttribute = "data-cl-click"; 

    const subscribeElements = document.querySelectorAll<HTMLElement>(".onesignal-customlink-subscribe");
    subscribeElements.forEach((subscribe: HTMLElement) => {
      subscribe.textContent = config.text.subscribe;
      CustomLink.setResetClass(subscribe);
      CustomLink.setStateClass(subscribe, isPushEnabled);
      CustomLink.setStyleClass(subscribe, config.style);
      CustomLink.setSizeClass(subscribe, config.size);
      CustomLink.setCustomColors(subscribe, config);

      const hasEvent = !!subscribe.getAttribute(onClickAttribute);
      if (!hasEvent) {
        subscribe.addEventListener("click", async () => {
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
        subscribe.setAttribute(onClickAttribute, "1");
      }
    });

    const unsubscribeElements = document.querySelectorAll<HTMLElement>(".onesignal-customlink-unsubscribe");
    unsubscribeElements.forEach((unsubscribe: HTMLElement) => {
      if (config.text.unsubscribe) {
        unsubscribe.textContent = config.text.unsubscribe;
      }
      CustomLink.setResetClass(unsubscribe);
      CustomLink.setStateClass(unsubscribe, isPushEnabled);
      CustomLink.setStyleClass(unsubscribe, config.style);
      CustomLink.setSizeClass(unsubscribe, config.size);
      CustomLink.setCustomColors(unsubscribe, config);

      const hasEvent = !!unsubscribe.getAttribute(onClickAttribute);
      if (!hasEvent) {
        unsubscribe.addEventListener("click", async () => {
          Log.info("CustomLink: unsubscribe clicked");
          const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
          if (isPushEnabled) {
            await OneSignal.setSubscription(false);
          }
        });
        unsubscribe.setAttribute(onClickAttribute, "1");
      }
    });

    const explanationElements = document.querySelectorAll<HTMLElement>(".onesignal-customlink-explanation");
    explanationElements.forEach((explanation: HTMLElement) => {
      if (config.text.explanation) {
        explanation.textContent = config.text.explanation;
      }
      CustomLink.setResetClass(explanation);
      CustomLink.setStateClass(explanation, isPushEnabled);
      CustomLink.setSizeClass(explanation, config.size);
    });
  }

  private static setCustomColors(element: HTMLElement, config: AppUserConfigCustomLinkOptions) {
    if (config.style === "button") {
      element.style.backgroundColor = config.color.button;
      element.style.color = config.color.text;
    } else if (config.style === "link") {
      element.style.color = config.color.text;
    }
  }

  private static setStateClass(element: HTMLElement, subscribed: boolean) {
    const oldClassName = subscribed ? "state-unsubscribed" : "state-subscribed";
    const newClassName = subscribed ? "state-subscribed" : "state-unsubscribed";

    if (hasCssClass(element, oldClassName)) {
      removeCssClass(element, oldClassName);
    }

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setStyleClass(element: HTMLElement, style: "button" | "link") {
    const newClassName = style;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setSizeClass(element: HTMLElement, size: "small" | "medium" | "large") {
    const newClassName = size;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setResetClass(element: HTMLElement) {
    const newClassName = "onesignal-reset";

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }
}

export default CustomLink;
