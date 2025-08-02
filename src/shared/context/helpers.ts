import type { AliasPair } from 'src/core/types/api';
import TimeoutError from '../errors/TimeoutError';

type Nullable = undefined | null;

interface IndexOfAble {
  indexOf(match: string): number;
}

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

/**
 * Returns true if match is in string; otherwise, returns false.
 */
export function containsMatch(
  indexOfAble: IndexOfAble | null | undefined,
  match: string,
) {
  if (!indexOfAble) return false;
  return indexOfAble.indexOf(match) !== -1;
}

/**
 * Returns the current object without keys that have undefined values.
 * Regardless of whether the return result is used, the passed-in object is destructively modified.
 * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
 * @param object
 */
export function trimUndefined(object: Record<string, unknown>) {
  for (const property in object) {
    if (object[property] === undefined) {
      delete object[property];
    }
  }
  return object;
}

/**
 * Capitalizes the first letter of the string.
 * @returns {string} The string with the first letter capitalized.
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isNullOrUndefined<T>(value: T | Nullable): boolean {
  return typeof value === 'undefined' || value === null;
}

export function valueOrDefault<T>(value: T | Nullable, defaultValue: T): T {
  if (typeof value === 'undefined' || value === null) {
    return defaultValue;
  }
  return value;
}

/**
 * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
 * Helps when logging method calls.
 */
export function stringify(obj: any) {
  return JSON.stringify(
    obj,
    (_, value) => {
      if (typeof value === 'function') {
        return '[Function]';
      } else {
        return value;
      }
    },
    4,
  );
}

/**
 * Used for generating query params
 *  e.g: -> hash = { appId } // with appId = '1234'
 *       -> returns "appId=1234"
 * @param  {any} hash
 * @returns string
 */
export function encodeHashAsUriComponent(hash: any): string {
  let uriComponent = '';
  const keys = Object.keys(hash);
  for (const key of keys) {
    const value = hash[key];
    uriComponent += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
  return uriComponent;
}

export function timeoutPromise(
  promise: Promise<any>,
  milliseconds: number,
): Promise<TimeoutError | any> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError());
    }, milliseconds);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Returns trimmed version number
 * e.g: "10.01.30" becomes "10.01"
 * @param version - version number we want to check
 */
export function parseVersionString(version: string | number): number {
  const osVersionParts = version.toString().split('.');
  const majorVersion = String(osVersionParts[0]).padStart(2, '0');
  let minorVersion: string;
  if (osVersionParts[1]) {
    minorVersion = String(osVersionParts[1]).padStart(2, '0');
  } else {
    minorVersion = '00';
  }

  return Number(`${majorVersion}.${minorVersion}`);
}

/**
 * Gives back the last x number of parts providing a string with a delimiter.
 * Example: lastParts("api.staging.onesignal.com", ".", 3) will return "staging.onesignal.com"
 */
export function lastParts(
  subject: string,
  delimiter: string,
  maxParts: number,
): string {
  const parts = subject.split(delimiter);
  const skipParts = Math.max(parts.length - maxParts, 0);
  return parts.slice(skipParts).join(delimiter);
}

export function enforceAppId(appId: string | undefined | null): void {
  if (!appId) {
    throw new Error('App id cannot be empty');
  }
}

export function enforceAlias(aliasPair: AliasPair): void {
  if (!aliasPair.label) {
    throw new Error('Alias label cannot be empty');
  }

  if (!aliasPair.id) {
    throw new Error('Alias id cannot be empty');
  }
}

export function sortArrayOfObjects<TObject, TProperty>(
  arrayToSort: TObject[],
  predicateForProperty: (obj: TObject) => TProperty,
  descending = false,
  doItInPlace = true,
): TObject[] {
  const internalArrayToSort = doItInPlace ? arrayToSort : arrayToSort.slice();
  internalArrayToSort.sort((a: TObject, b: TObject) => {
    const propertyA = predicateForProperty(a);
    const propertyB = predicateForProperty(b);

    if (propertyA > propertyB) {
      return !!descending ? -1 : 1;
    }
    if (propertyA < propertyB) {
      return !!descending ? 1 : -1;
    }
    return 0;
  });
  return internalArrayToSort;
}
