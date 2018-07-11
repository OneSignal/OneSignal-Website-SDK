/**
 * LocalStorage with expiring keys.
 *
 * Used when synchronous data access is required, like when clicking the notify button to show the
 * popup conditionally based on a storage value. IndexedDb and cross-frame communication is
 * asynchronous and loses the direct user action privilege required to show a popup.
 */
export default class TimedLocalStorage {
  /**
   * Performs a feature test to determine whether LocalStorage is accessible. For example, a user's
   * browser preferences set to prevent saving website data will disable LocalStorage.
   */
  public static isLocalStorageSupported(): boolean {
    try {
      if (typeof localStorage === "undefined") {
        return false;
      }
      localStorage.getItem("test");
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Sets a key in LocalStorage with an expiration time measured in minutes.
   */
  public static setItem(key: string, value: any, expirationInMinutes?: number): void {
    if (!TimedLocalStorage.isLocalStorageSupported()) {
      return;
    }
    const expirationInMilliseconds = typeof expirationInMinutes !== "undefined" ?
      expirationInMinutes * 60 * 1000 :
      0;
    const record = {
      value: JSON.stringify(value),
      timestamp: typeof expirationInMinutes !== "undefined" ?
        new Date().getTime() + expirationInMilliseconds :
        undefined,
    };
    localStorage.setItem(key, JSON.stringify(record));
  }

  /**
   * Retrieves a key from LocalStorage if the expiration time when the key was set hasn't already
   * expired.
   */
  public static getItem(key: string): any | null  {
    if (!TimedLocalStorage.isLocalStorageSupported()) {
      return null;
    }
    const record = localStorage.getItem(key);
    let parsedRecord;
    try {
      parsedRecord = JSON.parse(record);
    } catch (e) {
      return null;
    }
    if (parsedRecord === null) {
      return null;
    }

    if (parsedRecord.timestamp &&
      new Date().getTime() >= parsedRecord.timestamp) {
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
  public static removeItem(key: string): void  {
    if (!TimedLocalStorage.isLocalStorageSupported()) {
      return null;
    }
    localStorage.removeItem(key);
  }
}
