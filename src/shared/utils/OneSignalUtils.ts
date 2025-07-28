import { Utils } from '../context/Utils';
import { isBrowser } from '../environment/environment';
import Log from '../libraries/Log';

export class OneSignalUtils {
  public static getBaseUrl() {
    return location.origin;
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
