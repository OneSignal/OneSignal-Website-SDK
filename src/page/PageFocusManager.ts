import { ContextInterface } from "../models/Context";
import Log from "../libraries/Log";

/** Provides an event interface that fires on page focus events, includes:
  1. Page is foregrounded
  2. Page is backgrounded
  3. Page is unloaded
*/

export interface PageFocusChanged {
  onPageBackgrounded(): void;
  onPageForegrounded(): void;
  onPageUnloaded(): void;
}

export class PageFocusManager {
  private context: ContextInterface;
  private pageFocusChangedListeners: Array<PageFocusChanged>;

  constructor(context: ContextInterface) {
    this.context = context;
    this.pageFocusChangedListeners = new Array();
  }

  public addPageFocusChangedListener(pageFocusChanged: PageFocusChanged) {
    this.pageFocusChangedListeners.push(pageFocusChanged);
    this.setupSessionEventListeners();
  }

  async handleVisibilityChange(): Promise<void> {
    const visibilityState = document.visibilityState;

    if (visibilityState === "visible") {
      this.setupOnFocusAndOnBlurForSession();

      Log.debug("handleVisibilityChange", "visible", `hasFocus: ${document.hasFocus()}`);
      if (document.hasFocus()) {
        this.pageFocusChangedListeners.forEach(listener => { listener.onPageForegrounded(); });
      }
      return;
    }

    if (visibilityState === "hidden") {
      Log.debug("handleVisibilityChange", "hidden");
      if (OneSignal.cache.focusHandler && OneSignal.cache.isFocusEventSetup) {
        window.removeEventListener("focus", OneSignal.cache.focusHandler, true);
        OneSignal.cache.isFocusEventSetup = false;
      }
      if (OneSignal.cache.blurHandler && OneSignal.cache.isBlurEventSetup) {
        window.removeEventListener("blur", OneSignal.cache.blurHandler, true);
        OneSignal.cache.isBlurEventSetup = false;
      }

      this.pageFocusChangedListeners.forEach(listener => { listener.onPageBackgrounded(); });
      return;
    }

    // it should never be anything else at this point
    Log.warn("Unhandled visibility state happened", visibilityState);
  }

  async handleOnBeforeUnload(): Promise<void> {
    this.pageFocusChangedListeners.forEach(listener => { listener.onPageUnloaded(); });
  }

  async handleOnFocus(e: Event): Promise<void> {
    Log.debug("handleOnFocus", e);
    /**
     * Firefox has 2 focus events with different targets (document and window).
     * While Chrome only has one on window.
     * Target check is important to avoid double-firing of the event.
     */
    if (e.target !== window) {
      return;
    }

    this.pageFocusChangedListeners.forEach(listener => { listener.onPageForegrounded(); });
  }

  async handleOnBlur(e: Event): Promise<void> {
    Log.debug("handleOnBlur", e);
    /**
     * Firefox has 2 focus events with different targets (document and window).
     * While Chrome only has one on window.
     * Target check is important to avoid double-firing of the event.
     */
    if (e.target !== window) {
      return;
    }

    this.pageFocusChangedListeners.forEach(listener => { listener.onPageBackgrounded(); });
  }

  private setupSessionEventListeners(): void {
    // Only want these events if it's using subscription workaround
    if (
      !this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
      !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Not setting session event listeners. No service worker possible.");
      return;
    }

    if (!this.context.environmentInfo.canTalkToServiceWorker) {
      Log.debug("Not setting session event listeners. Can't talk to ServiceWorker due being hosted on an HTTP page.");
      return;
    }

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this.setupOnFocusAndOnBlurForSession();

    // To make sure we add these event listeners only once.
    if (!OneSignal.cache.isVisibilityChangeEventSetup) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this), true);
      OneSignal.cache.isVisibilityChangeEventSetup = true;
    }

    if (!OneSignal.cache.isBeforeUnloadEventSetup) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener("beforeunload", (e) => {
        this.handleOnBeforeUnload();
        // deleting value to not show confirmation dialog
        delete e.returnValue;
      }, true);
      OneSignal.cache.isBeforeUnloadEventSetup = true;
    }
  }

  setupOnFocusAndOnBlurForSession(): void {
    Log.debug("setupOnFocusAndOnBlurForSession");

    if (!OneSignal.cache.focusHandler) {
      OneSignal.cache.focusHandler = this.handleOnFocus.bind(this);
    }
    if (!OneSignal.cache.isFocusEventSetup) {
      window.addEventListener("focus", OneSignal.cache.focusHandler, true);
      OneSignal.cache.isFocusEventSetup = true;
    }

    if (!OneSignal.cache.blurHandler) {
      OneSignal.cache.blurHandler = this.handleOnBlur.bind(this);
    }
    if (!OneSignal.cache.isBlurEventSetup) {
      window.addEventListener("blur", OneSignal.cache.blurHandler, true);
      OneSignal.cache.isBlurEventSetup = true;
    }
  }
}
