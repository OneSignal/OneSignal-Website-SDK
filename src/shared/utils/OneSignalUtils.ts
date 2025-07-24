import bowser, { type IBowser } from 'bowser';
import { Utils } from '../context/Utils';
import { isBrowser } from '../helpers/environment';
import Log from '../libraries/Log';
import { bowserCastle } from './bowserCastle';

export class OneSignalUtils {
  public static getBaseUrl() {
    return location.origin;
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

  public static logMethodCall(methodName: string, ...args: any[]) {
    return Log.debug(
      `Called ${methodName}(${args.map(Utils.stringify).join(', ')})`,
    );
  }

  static isSafari(): boolean {
    return isBrowser && typeof window.safari !== 'undefined';
  }
}

export default OneSignalUtils;
