import { isPushNotificationsSupported } from "./BrowserSupportsPush";
import { OneSignalStubES6 } from "./OneSignalStubES6";
import { OneSignalStubES5 } from "./OneSignalStubES5";
// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

export class OneSignalShimLoader {

  private static VERSION = (typeof __VERSION__) === "undefined" ? 1 : Number(__VERSION__);

  // NOTE: scripts added won't start executing until
  private static addScriptToPage(url: string): void {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    scriptElement.async = true;
    document.head.appendChild(scriptElement);
  }

  // Some logic from SdkEnvironment
  private static getPathAndPrefix(): string {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      return "https://localhost:3001/sdks/Dev-";
    } else if (typeof __STAGING__ !== "undefined" && __STAGING__) {
      return `https://${window.location.host}/sdks/Staging-`;
    }
    return "https://cdn.onesignal.com/sdks/";
  }

// Will only be true for browsers that accepted OneSignal permissions before we moved to importing
//   the new OneSignalSDKWorker.js file.
  private static isServiceWorkerRuntime(): boolean {
    return (typeof window === "undefined");
  }

  private static serviceWorkerSupportsPush(): boolean {
    return (typeof self.registration !== "undefined");
  }

  private static addOneSignalPageES6SDKStub(): void {
    const oneSignalExists = (typeof (window as any).OneSignal !== "undefined");
    const oneSignalIsArray = Array.isArray((window as any).OneSignal);

    // 1. Do NOT replace window.OneSignal if its something else other than an Array.
    if (oneSignalExists && !oneSignalIsArray) {
      console.error(
        `window.OneSignal already defined as '${typeof OneSignal}'!
         Please make sure to define as 'var OneSignal = OneSignal || [];'`,
        OneSignal
      );
      return;
    }

    // 2. If this script was loaded with async or defer no need to create a stub.
    //    This means the site developer would have to be using OneSignal.push(...) already
    // This check technically isn't needed but due to the complexly of OneSignalStubES6
    //    would like to only load it when needed in case of any issues
    const thisScript: any = document.currentScript; // TODO: Can drop 'any' after updating TypeScript
    if (thisScript) {
      if (thisScript.async || thisScript.defer)
        return;
    }

    // 3. Stub out all OneSignal functions with an implementation that save all params
    //    OneSignalPageSDKES6.js will load soon and the function calls will be
    //    replayed from pageSdkInit.ts
    console.warn(`Deprecation Warning!: Please load OneSignalSDK.js async and use 'var OneSignal = OneSignal || [];
                 Direct calls to OneSignal without going through OneSignal.push(...) will be dropped in the future!`);
    (window as any).OneSignal = new OneSignalStubES6();
  }

// Stub out all functions with default values. Unlike ES6 all ES5 support will be in OneSignalSDK.js
  private static addOneSignalPageES5SDKStub(): void {
    console.log("OneSignal: Using fallback ES5 Stub for backwards compatibility.");
    (window as any).OneSignal = new OneSignalStubES5();
  }

  public static start(): void {
    if (OneSignalShimLoader.isServiceWorkerRuntime()) {
      if (OneSignalShimLoader.serviceWorkerSupportsPush()) {
        (self as any).importScripts(
          `${OneSignalShimLoader.getPathAndPrefix()}OneSignalSDKWorker.js?v=${OneSignalShimLoader.VERSION}`
        );
      }
    }
    else if (isPushNotificationsSupported()) {
      OneSignalShimLoader.addScriptToPage(
        `${OneSignalShimLoader.getPathAndPrefix()}OneSignalPageSDKES6.js?v=${OneSignalShimLoader.VERSION}`
      );
      OneSignalShimLoader.addOneSignalPageES6SDKStub();
    }
    else {
      OneSignalShimLoader.addOneSignalPageES5SDKStub();
      // TODO: Make sure this is all working in the browser, now that this is in a static class
      //        - Test service worker
      //        - Test ES6
      //        - Test ES5
    }
  }
}
