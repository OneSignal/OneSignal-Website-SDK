/**
 * LocalStorage with expiring keys.
 *
 * Used when synchronous data access is required, like when clicking the notify button to show the
 * popup conditionally based on a storage value. IndexedDb and cross-frame communication is
 * asynchronous and loses the direct user action privilege required to show a popup.
 */
/**
 * Performs a feature test to determine whether LocalStorage is accessible. For example, a user's
 * browser preferences set to prevent saving website data will disable LocalStorage.
 */
export function isLocalStorageSupported(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    localStorage.getItem('test');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sets a key in LocalStorage with an expiration time measured in minutes.
 */
export function setItem(
  key: string,
  value: any,
  expirationInMinutes?: number,
): void {
  if (!isLocalStorageSupported()) {
    return;
  }
  const expirationInMilliseconds =
    typeof expirationInMinutes !== 'undefined'
      ? expirationInMinutes * 60 * 1000
      : 0;
  const record = {
    value: JSON.stringify(value),
    timestamp:
      typeof expirationInMinutes !== 'undefined'
        ? new Date().getTime() + expirationInMilliseconds
        : undefined,
  };
  localStorage.setItem(key, JSON.stringify(record));
}

/**
 * Retrieves a key from LocalStorage if the expiration time when the key was set hasn't already
 * expired.
 */
export function getItem(key: string): any | null {
  if (!isLocalStorageSupported()) {
    return null;
  }
  const record = localStorage.getItem(key);
  let parsedRecord;
  try {
    // @ts-expect-error - we have this in a try catch
    parsedRecord = JSON.parse(record);
  } catch (e) {
    return null;
  }
  if (parsedRecord === null) {
    return null;
  }

  if (
    parsedRecord.timestamp &&
    new Date().getTime() >= parsedRecord.timestamp
  ) {
    localStorage.removeItem(key);
    return null;
  }

  let parsedRecordValue = parsedRecord.value;
  try {
    parsedRecordValue = JSON.parse(parsedRecord.value);
  } catch (e) {
    return parsedRecordValue;
  }
  return parsedRecordValue;
}

/**
 * Removes an item from LocalStorage.
 */
export function removeItem(key: string): null | void {
  if (!isLocalStorageSupported()) {
    return null;
  }
  localStorage.removeItem(key);
}
