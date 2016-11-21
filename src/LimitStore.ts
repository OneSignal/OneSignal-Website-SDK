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
  static store = {};
  static LIMIT = 2;

  static put(key, value) {
    if (LimitStore.store[key] === undefined) {
      LimitStore.store[key] = [null, null];
    }
    LimitStore.store[key].push(value);
    if (LimitStore.store[key].length == LimitStore.LIMIT + 1) {
      LimitStore.store[key].shift();
    }
    return LimitStore.store[key];
  }

  static get(key) {
    if (LimitStore.store[key] === undefined) {
      LimitStore.store[key] = [null, null];
    }
    return LimitStore.store[key];
  }

  static getFirst(key) {
    return LimitStore.get(key)[0];
  }

  static getLast(key) {
    return LimitStore.get(key)[1];
  }

  static remove(key) {
    delete LimitStore.store[key];
  }

  static isEmpty(key) {
    let values = LimitStore.get(key);
    return values[0] === null && values[1] === null;
  }
}