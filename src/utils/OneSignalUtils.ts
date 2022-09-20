import bowser, { IBowser } from "bowser";
import SdkEnvironment from "../managers/SdkEnvironment";
import Environment from "../Environment";
import { WindowEnvironmentKind } from "../models/WindowEnvironmentKind";
import Log from "../libraries/Log";
import { Utils } from "../context/shared/utils/Utils";

export class OneSignalUtils {
  public static getBaseUrl() {
    return location.origin;
  }

  public static isLocalhostAllowedAsSecureOrigin(): boolean {
    return (
      OneSignal.config &&
      OneSignal.config.userConfig &&
      OneSignal.config.userConfig.allowLocalhostAsSecureOrigin === true
    );
  }

  /**
   * Returns true if web push subscription occurs on a subdomain of OneSignal.
   * If true, our main IndexedDB is stored on the subdomain of onesignal.com, and not the user"s site.
   * @remarks
   *   This method returns true if:
   *     - The browser is not Safari
   *         - Safari uses a different method of subscription and does not require our workaround
   *     - The init parameters contain a subdomain (even if the protocol is HTTPS)
   *         - HTTPS users using our subdomain workaround still have the main IndexedDB stored on our subdomain
   *        - The protocol of the current webpage is http:
   *   Exceptions are:
   *     - Safe hostnames like localhost and 127.0.0.1
   *          - Because we don"t want users to get the wrong idea when testing on localhost that direct permission is supported on HTTP, we"ll ignore these exceptions. HTTPS will always be required for direct permission
   *        - We are already in popup or iFrame mode, or this is called from the service worker
   */
  public static isUsingSubscriptionWorkaround(): boolean {
    const windowEnv = SdkEnvironment.getWindowEnv();

    if (!OneSignal.config) {
      throw new Error(
        `(${windowEnv.toString()}) isUsingSubscriptionWorkaround() cannot be called until OneSignal.config exists.`
      );
    }
    if (bowser.safari) {
      return false;
    }

    const allowLocalhostAsSecureOrigin: boolean = this.isLocalhostAllowedAsSecureOrigin();

    return OneSignalUtils.internalIsUsingSubscriptionWorkaround(
      OneSignal.config.subdomain, allowLocalhostAsSecureOrigin
    );
  }

  public static internalIsUsingSubscriptionWorkaround(
    subdomain: string | undefined,
    allowLocalhostAsSecureOrigin: boolean | undefined
  ): boolean {
    if (bowser.safari) {
      return false;
    }

    if (allowLocalhostAsSecureOrigin === true &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      return false;
    }

    const windowEnv = SdkEnvironment.getWindowEnv();
    return (
      (windowEnv === WindowEnvironmentKind.Host || windowEnv === WindowEnvironmentKind.CustomIframe) &&
      (!!subdomain || location.protocol === "http:")
    );
  }

  public static redetectBrowserUserAgent(): IBowser {
    // During testing, the browser object may be initialized before the userAgent is injected
    if (bowser.name === "" && bowser.version === "") {
      return bowser._detect(navigator.userAgent);
    }
    return bowser;
  }

  /**
   * Returns true if the UUID is a string of 36 characters;
   * @param uuid
   * @returns {*|boolean}
   */
  public static isValidUuid(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
  }

  public static getRandomUuid(): string {
    let uuidStr = '';
    const crypto = typeof window === 'undefined' ? (global as any).crypto : window.crypto || (<any>window).msCrypto;
    if (crypto) {
      uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    } else {
      uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    return uuidStr;
  }

  public static logMethodCall(methodName: string, ...args: any[]) {
    return Log.debug(`Called %c${methodName}(${args.map(Utils.stringify).join(', ')})`, Utils.getConsoleStyle('code'), '.');
  }

  static isHttps(): boolean {
    if (OneSignalUtils.isSafari()) {
      return window.location.protocol === "https:";
    }
    return !OneSignalUtils.isUsingSubscriptionWorkaround();
  }

  static isSafari(): boolean {
    return Environment.isBrowser() && typeof window.safari !== "undefined";
  }
}

export default OneSignalUtils;
