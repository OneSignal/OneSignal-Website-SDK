import TimeoutError from '../errors/TimeoutError';

interface IndexOfAble {
  indexOf(match:string): number;
}

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export class Utils {
  /**
   * Returns true if match is in string; otherwise, returns false.
   */
  public static contains(indexOfAble: IndexOfAble | null | undefined, match: string) {
    if (!indexOfAble)
      return false;
    return indexOfAble.indexOf(match) !== -1;
  }

  public static getConsoleStyle(style: string) {
    if (style == 'code') {
      return `padding: 0 1px 1px 5px;border: 1px solid #ddd;border-radius: 3px;font-family: Monaco,"DejaVu Sans Mono","Courier New",monospace;color: #444;`;
    } else if (style == 'bold') {
      return `font-weight: 600;color: rgb(51, 51, 51);`;
    } else if (style == 'alert') {
      return `font-weight: 600;color: red;`;
    } else if (style == 'event') {
      return `color: green;`;
    } else if (style == 'postmessage') {
      return `color: orange;`;
    } else if (style == 'serviceworkermessage') {
      return `color: purple;`;
    } else {
      return '';
    }
  }

  /**
   * Returns the current object without keys that have undefined values.
   * Regardless of whether the return result is used, the passed-in object is destructively modified.
   * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
   * @param object
   */
  public static trimUndefined(object: any) {
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        if (object[property] === undefined) {
          delete object[property];
        }
      }
    }
    return object;
  }

  /**
   * Capitalizes the first letter of the string.
   * @returns {string} The string with the first letter capitalized.
   */
  public static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
   * Helps when logging method calls.
   */
  public static stringify(obj: any) {
    return JSON.stringify(obj, (_, value) => {
      if (typeof value === 'function') {
        return "[Function]";
      }
      else {
        return value;
      }
    }, 4);
  }

  public static encodeHashAsUriComponent(hash: any): string {
    let uriComponent = '';
    const keys = Object.keys(hash);
    for (var key of keys) {
      const value = hash[key];
      uriComponent += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    }
    return uriComponent;
  }

  public static timeoutPromise(promise: Promise<any>, milliseconds: number): Promise<TimeoutError | any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError())
      }, milliseconds);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  public static getValueOrDefault<T>(value: T | undefined | null, defaultValue: T): T {
    if (value !== undefined && value !== null) {
      return value;
    }
    return defaultValue;
  }

  /**
   * This is similar to ECMAScript2107 String.prototype.padStart.
   * Switch to this after updating TypeScript and can confirm it gets transpiled down to ES6
   * @param str - String to pad left
   * @param targetLength - Length to make the string
   * @param padString - String value of length one to pad with.
   * @returns {string} - Resulting string padded
   */
  public static padStart(str: string, targetLength: number, padString: string): string {
    let result = str;
    while(result.length < targetLength) {
      result = padString + result;
    }
    return result;
  }

  /**
   * Checks if a version is number is greater than or equal (AKA at least) to a specific compare
   *   to version.
   * Limited to only checking for major and minor version values, patch versions are ignored
   * @param toCheck - Version we want to check
   * @param compareTo - Version we want to be at or higher
   * @returns {string} - Returns true if toCheck >= compareTo
   */
  public static isVersionAtLeast(toCheck: string | number, compareTo: number): boolean {
    const osVersionParts = toCheck.toString().split(".");
    const majorVersion = Utils.padStart(osVersionParts[0], 2, "0");
    let minorVersion: string;
    if (osVersionParts[1]) {
      minorVersion = Utils.padStart(osVersionParts[1], 2, "0");
    }
    else {
      minorVersion = "00";
    }

    const majorAndMinor = Number(`${majorVersion}.${minorVersion}`);
    return majorAndMinor >= compareTo;
  }

  public static enforceAppId(appId: string | undefined | null): void {
    if (!appId) {
      throw new Error("App id cannot be empty");
    }
  }

  public static enforcePlayerId(playerId: string | undefined | null): void {
    if (!playerId) {
      throw new Error("Player id cannot be empty");
    }
  }
}

export default Utils;
