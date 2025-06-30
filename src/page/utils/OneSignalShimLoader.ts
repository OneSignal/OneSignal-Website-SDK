import {
  BUILD_ORIGIN,
  BUILD_TYPE,
  IS_HTTPS,
  NO_DEV_PORT,
  VERSION,
} from 'src/shared/utils/EnvVariables';
import {
  isIosSafari,
  isPushNotificationsSupported,
} from './BrowserSupportsPush';
// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

// See sdk.ts for what entry points this handles

export class OneSignalShimLoader {
  private static VERSION = VERSION();

  private static addScriptToPage(url: string): void {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    // Using defer over async; async timing is inconsistent and may interrupt DOM rendering
    scriptElement.defer = true;
    document.head.appendChild(scriptElement);
  }

  // Same logic from SdkEnvironment
  private static getPathAndPrefix(): string {
    const buildOrigin = BUILD_ORIGIN();
    const noDevPort = NO_DEV_PORT();
    const buildType = BUILD_TYPE();
    const isHttps = IS_HTTPS();

    const productionOrigin = 'https://cdn.onesignal.com/sdks/web/v16/';
    const protocol = isHttps ? 'https' : 'http';
    const port = isHttps ? 4001 : 4000;

    // using if statements to have better dead code elimination
    if (buildType === 'development')
      return noDevPort
        ? `${protocol}://${buildOrigin}/sdks/web/v16/Dev-`
        : `${protocol}://${buildOrigin}:${port}/sdks/web/v16/Dev-`;

    if (buildType === 'staging')
      return `https://${buildOrigin}/sdks/web/v16/Staging-`;

    return productionOrigin;
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
