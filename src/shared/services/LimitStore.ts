/*
 LimitStore.put('colorado', 'rocky');
 ["rocky"]
 LimitStore.put('colorado', 'mountain');
 ["rocky", "mountain"]
 LimitStore.put('colorado', 'national');
 ["mountain", "national"]
 LimitStore.put('colorado', 'park');
 ["national", "park"]
 */
export default class LimitStore {
  static store: Record<string, Array<unknown>> = {};
  static LIMIT = 2;

  static put<T>(key: string, value: T) {
    if (LimitStore.store[key] === undefined) {
      LimitStore.store[key] = [null, null];
    }
    LimitStore.store[key].push(value);
    if (LimitStore.store[key].length == LimitStore.LIMIT + 1) {
      LimitStore.store[key].shift();
    }
    return LimitStore.store[key];
  }

  static get<T>(key: string): T[] {
    if (LimitStore.store[key] === undefined) {
      LimitStore.store[key] = [null, null];
    }
    return LimitStore.store[key] as T[];
  }

  static getFirst<T>(key: string) {
    return LimitStore.get<T>(key)[0];
  }

  static getLast<T>(key: string) {
    return LimitStore.get<T>(key)[1];
  }

  static remove(key: string) {
    delete LimitStore.store[key];
  }

  static isEmpty(key: string) {
    const values = LimitStore.get(key);
    return values[0] === null && values[1] === null;
  }
}
