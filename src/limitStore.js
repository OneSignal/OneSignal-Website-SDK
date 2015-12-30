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
function LimitStore() {
}

LimitStore.store = {};
LimitStore.LIMIT = 2;

LimitStore.put = function (key, value) {
  if (LimitStore.store[key] === undefined) {
    LimitStore.store[key] = [null, null];
  }
  LimitStore.store[key].push(value);
  if (LimitStore.store[key].length == LimitStore.LIMIT + 1) {
    LimitStore.store[key].shift();
  }
  return LimitStore.store[key];
};

LimitStore.get = function (key) {
  if (LimitStore.store[key] === undefined) {
    LimitStore.store[key] = [null, null];
  }
  return LimitStore.store[key];
};

LimitStore.getFirst = function (key) {
  return LimitStore.get(key)[0];
};

LimitStore.getLast = function (key) {
  return LimitStore.get(key)[1];
};

LimitStore.remove = function (key) {
  delete LimitStore[key];
};

LimitStore.isEmpty = function(key) {
  let values = LimitStore.get(key);
  return values[0] === null && values[1] === null;
};

export default LimitStore;