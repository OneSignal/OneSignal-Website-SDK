/*
 limitStorePut('colorado', 'rocky');
 ["rocky"]
 limitStorePut('colorado', 'mountain');
 ["rocky", "mountain"]
 limitStorePut('colorado', 'national');
 ["mountain", "national"]
 limitStorePut('colorado', 'park');
 ["national", "park"]
 */
const LIMIT = 2;
const store: Record<string, Array<unknown>> = {};

export function limitStorePut<T>(key: string, value: T) {
  if (store[key] === undefined) {
    store[key] = [null, null];
  }
  store[key].push(value);
  if (store[key].length === LIMIT + 1) {
    store[key].shift();
  }
  return store[key];
}

export function limitStoreGet<T>(key: string): T[] {
  if (store[key] === undefined) {
    store[key] = [null, null];
  }
  return store[key] as T[];
}

export function limitGetFirst<T>(key: string) {
  return limitStoreGet<T>(key)[0];
}

export function limitGetLast<T>(key: string) {
  return limitStoreGet<T>(key)[1];
}

export function limitRemove(key: string) {
  delete store[key];
}

export function limitIsEmpty(key: string) {
  const values = limitStoreGet(key);
  return values[0] === null && values[1] === null;
}
