import { isPushNotificationsSupported } from "./BrowserSupportsPush";
import { OneSignalStubES6 } from "./OneSignalStubES6";
import { OneSignalStubES5 } from "./OneSignalStubES5";
import { PossiblePredefinedOneSignal } from "./OneSignalStub";
// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

// See sdk.ts for what entry points this handles

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
    const buildOrigin = (typeof __BUILD_ORIGIN__ !== "undefined") ? __BUILD_ORIGIN__ || "localhost" : "localhost";
    const productionOrigin = "https://cdn.onesignal.com/sdks/";

    if (typeof __BUILD_TYPE__ === "undefined") {
      return productionOrigin;
    }

    switch(__BUILD_TYPE__){
      case "development":
        return `https://${buildOrigin}:4001/sdks/Dev-`;
      case "staging":
        return `https://${window.location.host}/sdks/Staging-`;
      default:
        return productionOrigin;
    }
  }

// Will only be true for browsers that accepted OneSignal permissions before we moved to importing
//   the new OneSignalSDKWorker.js file.
  private static isServiceWorkerRuntime(): boolean {
    return (typeof window === "undefined");
  }

  private static addOneSignalPageES6SDKStub(): void {
    const predefinedOneSignal: PossiblePredefinedOneSignal = (<any>window).OneSignal;
    const oneSignalIsArray = Array.isArray(predefinedOneSignal);

    // Do NOT replace window.OneSignal if it's something else other than an Array.
    if (!!predefinedOneSignal && !oneSignalIsArray) {
      console.error(
        `window.OneSignal already defined as '${typeof OneSignal}'!
         Please make sure to define as 'window.OneSignal = window.OneSignal || [];'`,
        OneSignal
      );
      return;
    }

    // Stub out all OneSignal functions with an implementation that save all params.
    // OneSignalPageSDKES6.js will load soon and the function calls will be replayed from pageSdkInit.ts
    // This is done regardless if document.currentScript.async is true as window.OneSignal needs to be available
    //   for those who use script.onload = function() { } to add OneSignalSDK.js
    (<any>window).OneSignal = new OneSignalStubES6(predefinedOneSignal);
  }

  // Stub out all functions with default values.
  // OneSignalStubES5 class is bundled into the production OneSignalSDK.js so other .js files are loaded.
  private static addOneSignalPageES5SDKStub(): void {
    console.log("OneSignal: Using fallback ES5 Stub for backwards compatibility.");
    const predefinedOneSignal: PossiblePredefinedOneSignal = (<any>window).OneSignal;
    (<any>window).OneSignal = new OneSignalStubES5(predefinedOneSignal);
  }

  public static start(): void {
    if (OneSignalShimLoader.isServiceWorkerRuntime()) {
      if (isPushNotificationsSupported()) {
        (<ServiceWorkerGlobalScope><any>self).importScripts(
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
    }
  }
}
