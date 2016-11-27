export interface ValidatorOptions {
  allowNull?: boolean;
  allowEmpty?: boolean;
  /**
   * For validating URLs, requires that the URL begins with https://.
   */
  requireHttps?: boolean;
}

export class ValidatorUtils {
  static isValidUrl(url: any, options?: ValidatorOptions) {
    if (options && options.allowNull && url === null)
        return true;
    else if (options && options.allowEmpty && (url === null || url === undefined))
      return true;
    else {
      try {
        const parsedUrl = new URL(url);
        if (options && options.requireHttps) {
          return parsedUrl.protocol === 'https:';
        } else
          return true;
      } catch (e) {
        return false;
      }
    }
  }

  static isValidBoolean(bool: any, options?: ValidatorOptions) {
    if (options && options.allowNull && bool === null)
      return true;
    else
      return bool === true || bool === false;
  }

  static isValidArray(array: any, options?: ValidatorOptions) {
    if (options && options.allowNull && array === null)
      return true;
    else if (options && options.allowEmpty && (array === null || array === undefined))
      return true;
    else
      return array instanceof Array;
  }
}

