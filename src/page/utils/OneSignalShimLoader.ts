import { isPushNotificationsSupported } from "./BrowserSupportsPush";
// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

// See sdk.ts for what entry points this handles

export class OneSignalShimLoader {

  private static VERSION = (typeof __VERSION__) === "undefined" ? 1 : Number(__VERSION__);

  private static addScriptToPage(url: string): void {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    // Using defer over async; async timing is inconsistent and may interrupt DOM rendering
    scriptElement.defer = true;
    document.head.appendChild(scriptElement);
  }

  // Same logic from SdkEnvironment
  private static getPathAndPrefix(): string {
    const buildOrigin = (typeof __BUILD_ORIGIN__ !== "undefined") ? __BUILD_ORIGIN__ || "localhost" : "localhost";
    const productionOrigin = "https://cdn.onesignal.com/sdks/";

    if (typeof __BUILD_TYPE__ === "undefined") {
      return productionOrigin;
    }

    const isHttps = (typeof __IS_HTTPS__ !== "undefined") ? __IS_HTTPS__ : true;
    const protocol = isHttps ? "https" : "http";
    const port = isHttps ? 4001 : 4000;

    switch(__BUILD_TYPE__){
      case "development":
        return __NO_DEV_PORT__ ? `${protocol}://${buildOrigin}/sdks/Dev-` : `${protocol}://${buildOrigin}:${port}/sdks/Dev-`;
      case "staging":
        return `https://${buildOrigin}/sdks/Staging-`;
      default:
        return productionOrigin;
    }
  }

  private static loadFullPageSDK(): void {
    OneSignalShimLoader.addScriptToPage(
      `${OneSignalShimLoader.getPathAndPrefix()}OneSignalPageSDKES6.js?v=${OneSignalShimLoader.VERSION}`
    );
  }

  public static start(): void {
    if (isPushNotificationsSupported()) {
      OneSignalShimLoader.loadFullPageSDK();
    }
    else {
      console.log("OneSignal: SDK is not compatible with this browser.");
    }
  }
}
