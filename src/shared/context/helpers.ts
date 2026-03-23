import type { AliasPair } from 'src/core/types/api';

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

export function timeoutPromise(promise: Promise<any>, milliseconds: number): Promise<Error | any> {
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
