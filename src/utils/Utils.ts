import TimeoutError from '../errors/TimeoutError';

interface IndexOfAble {
  indexOf(match:string): number;
}

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
}

export default Utils;
