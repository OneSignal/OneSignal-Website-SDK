import bowser, { IBowser } from 'bowser';
import SdkEnvironment from '../managers/SdkEnvironment';
import Environment from '../helpers/Environment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { Utils } from '../context/Utils';
import Log from '../libraries/Log';
import { bowserCastle } from './bowserCastle';

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

  public static redetectBrowserUserAgent(): IBowser {
    // During testing, the browser object may be initialized before the userAgent is injected
    if (bowserCastle().name === '' && bowserCastle().version === '') {
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
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      uuid,
    );
  }

  public static getRandomUuid(): string {
    const crypto =
      typeof window === 'undefined'
        ? (global as any).crypto
        : window.crypto || (<any>window).msCrypto;
    const uuidStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
    return uuidStr;
  }

  public static logMethodCall(methodName: string, ...args: any[]) {
    return Log.debug(
      `Called ${methodName}(${args.map(Utils.stringify).join(', ')})`,
    );
  }

  static isHttps(): boolean {
    return window.location.protocol === 'https:';
  }

  static isSafari(): boolean {
    return Environment.isBrowser() && typeof window.safari !== 'undefined';
  }
}

export default OneSignalUtils;
