import type { AliasPair } from 'src/core/types/api';

interface IndexOfAble {
  indexOf(match: string): number;
}

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
): Promise<Error | any> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Async operation timed out'));
    }, milliseconds);
  });
  return Promise.race([promise, timeoutPromise]);
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
