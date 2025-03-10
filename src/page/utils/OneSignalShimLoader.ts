import {
  isIosSafari,
  isPushNotificationsSupported,
} from './BrowserSupportsPush';
// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

// See sdk.ts for what entry points this handles

export class OneSignalShimLoader {
  private static VERSION =
    typeof __VERSION__ === 'undefined' ? 1 : Number(__VERSION__);

  private static addScriptToPage(url: string): void {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    // Using defer over async; async timing is inconsistent and may interrupt DOM rendering
    scriptElement.defer = true;
    document.head.appendChild(scriptElement);
  }

  // Same logic from SdkEnvironment
  private static getPathAndPrefix(): string {
    const buildOrigin = __BUILD_ORIGIN__;
    const productionOrigin = 'https://cdn.onesignal.com/sdks/web/v16/';
    const protocol = __IS_HTTPS__ ? 'https' : 'http';
    const port = __IS_HTTPS__ ? 4001 : 4000;

    switch (__BUILD_TYPE__) {
      case 'development':
        return __NO_DEV_PORT__
          ? `${protocol}://${buildOrigin}/sdks/web/v16/Dev-`
          : `${protocol}://${buildOrigin}:${port}/sdks/web/v16/Dev-`;
      case 'staging':
        return `https://${buildOrigin}/sdks/web/v16/Staging-`;
      default:
        return productionOrigin;
    }
  }

  private static loadFullPageSDK(): void {
    OneSignalShimLoader.addScriptToPage(
      `${OneSignalShimLoader.getPathAndPrefix()}OneSignalSDK.page.es6.js?v=${
        OneSignalShimLoader.VERSION
      }`,
    );
  }

  public static start(): void {
    if (isPushNotificationsSupported()) {
      OneSignalShimLoader.loadFullPageSDK();
    } else {
      this.printEnvironmentNotSupported();
    }
  }

  private static printEnvironmentNotSupported() {
    let logMessage = 'OneSignal: SDK is not compatible with this browser.';
    if (isIosSafari()) {
      logMessage +=
        ' To support iOS please install as a Web App. See the OneSignal guide https://documentation.onesignal.com/docs/safari-web-push-for-ios';
    }
    console.info(logMessage);
  }
}
