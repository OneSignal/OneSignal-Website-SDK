import { hasCssClass, addCssClass, removeCssClass } from "./utils";
import { AppUserConfigCustomLinkOptions } from "./models/AppConfig";
import { ResourceLoadState } from "./services/DynamicResourceLoader";
import Log from "./libraries/Log";
import { RegisterOptions } from './helpers/InitHelper';
import OneSignal from "./OneSignal";

export class CustomLink {
  public static readonly initializedAttribute = "data-cl-initialized";
  public static readonly subscriptionStateAttribute = "data-cl-state";
  public static readonly optedOutAttribute = "data-cl-optedout";

  public static readonly containerClass = "onesignal-customlink-container";
  public static readonly containerSelector = `.${CustomLink.containerClass}`;
  public static readonly subscribeClass = "onesignal-customlink-subscribe";
  public static readonly subscribeSelector = `.${CustomLink.subscribeClass}`;
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
      if (!CustomLink.isInitialized(element)) {
        CustomLink.injectMarkup(element, config);
      }
    });

    const isPushEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    const isOptedOut = await OneSignal.internalIsOptedOut();

    const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
    subscribeElements.forEach((element: HTMLElement) =>
      CustomLink.initSubscribeElement(element, config, isPushEnabled, isOptedOut));

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

    CustomLink.markAsInitialized(container);
  }

  private static initSubscribeElement(element: HTMLElement,
    config: AppUserConfigCustomLinkOptions, isPushEnabled: boolean, isOptedOut: boolean): void {
    if (config.text && config.text.subscribe) {
      if (!isPushEnabled) {
        element.textContent = config.text.subscribe;
      }
    }

    if (config.text && config.text.unsubscribe) {
      if (isPushEnabled) {
        element.textContent = config.text.unsubscribe;
      }
    }
    CustomLink.setResetClass(element);
    CustomLink.setStateClass(element, isPushEnabled);
    CustomLink.setStyleClass(element, config);
    CustomLink.setSizeClass(element, config);
    CustomLink.setCustomColors(element, config);

    if (config.unsubscribeEnabled !== true) {
      addCssClass(element, "hide");
    }
    element.setAttribute(CustomLink.subscriptionStateAttribute, isPushEnabled.toString());
    element.setAttribute(CustomLink.optedOutAttribute, isOptedOut.toString());
    if (!CustomLink.isInitialized(element)) {
      element.addEventListener("click", () => {
        Log.info("CustomLink: subscribe clicked");
        CustomLink.handleClick(element);
      });

      CustomLink.markAsInitialized(element);
    }
  }

  public static async handleClick(element: HTMLElement): Promise<void> {
    const state: boolean = element.getAttribute(CustomLink.subscriptionStateAttribute) === "true";
    const optedOut: boolean = element.getAttribute(CustomLink.optedOutAttribute) === "true";
    if (state) {
      const isPushEnabled = await OneSignal.privateIsPushNotificationsEnabled();
      if (isPushEnabled) {
        await OneSignal.setSubscription(false);
      }
    } else {
      if (!optedOut) {
        const autoAccept = !OneSignal.environmentInfo.requiresUserInteraction;
        const options: RegisterOptions = { autoAccept };
        await OneSignal.registerForPushNotifications(options);
      } else {
        await OneSignal.setSubscription(true);
      }
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
    if (config.unsubscribeEnabled !== true) {
      addCssClass(element, "hide");
    }
  }

  // Using stricter HTMLElement class for element parameter to access style property 
  private static setCustomColors(element: HTMLElement, config: AppUserConfigCustomLinkOptions): void {
    if (config.style === "button" && config.color && config.color.button && config.color.text) {
      element.style.backgroundColor = config.color.button;
      element.style.color = config.color.text;
    } else if (config.style === "link" && config.color && config.color.text) {
      element.style.color = config.color.text;
    }
  }

  private static setStateClass(element: Element, subscribed: boolean): void {
    const oldClassName = subscribed ? "state-unsubscribed" : "state-subscribed";
    const newClassName = subscribed ? "state-subscribed" : "state-unsubscribed";

    if (hasCssClass(element, oldClassName)) {
      removeCssClass(element, oldClassName);
    }

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setStyleClass(element: Element, config: AppUserConfigCustomLinkOptions): void {
    if (!config || !config.style) {
      return
    }
    const newClassName = config.style;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setSizeClass(element: Element, config: AppUserConfigCustomLinkOptions): void {
    if (!config || !config.size) {
      return;
    }
    const newClassName = config.size;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static setResetClass(element: Element): void {
    const newClassName = CustomLink.resetClass;

    if (!hasCssClass(element, newClassName)) {
      addCssClass(element, newClassName);
    }
  }

  private static markAsInitialized(element: Element): void {
    element.setAttribute(CustomLink.initializedAttribute, "true");
  }

  private static isInitialized(element: Element): boolean {
    return element.getAttribute(CustomLink.initializedAttribute) === "true";
  }
}

export default CustomLink;
