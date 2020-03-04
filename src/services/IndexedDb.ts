
import Emitter from '../libraries/Emitter';
import Log from '../libraries/Log';
import Utils from "../context/shared/utils/Utils";

export default class IndexedDb {

  public emitter: Emitter;
  private database: IDBDatabase | undefined;
  private openLock: Promise<IDBDatabase> | undefined;

  constructor(private databaseName: string) {
    this.emitter = new Emitter();
  }

  private open(databaseName: string): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>(resolve => {
      let request: IDBOpenDBRequest | undefined = undefined;
      try {
        // Open algorithm: https://www.w3.org/TR/IndexedDB/#h-opening
        request = indexedDB.open(databaseName, 1);
      } catch (e) {
        // Errors should be thrown on the request.onerror event, but just in case Firefox throws additional errors
        // for profile schema too high
      }
      if (!request) {
        return null;
      }
      request.onerror = this.onDatabaseOpenError;
      request.onblocked = this.onDatabaseOpenBlocked;
      request.onupgradeneeded = this.onDatabaseUpgradeNeeded;
      request.onsuccess = () => {
        this.database = request.result;
        this.database.onerror = this.onDatabaseError;
        this.database.onversionchange = this.onDatabaseVersionChange;
        resolve(this.database);
      };
    });
  }

  private async ensureDatabaseOpen(): Promise<IDBDatabase> {
    if (!this.openLock) {
      this.openLock = this.open(this.databaseName);
    }
    return await this.openLock;
  }

  private onDatabaseOpenError(event: any) {
    // Prevent the error from bubbling: https://bugzilla.mozilla.org/show_bug.cgi?id=1331103#c3
    /**
     * To prevent error reporting tools like Sentry.io from picking up errors that
     * the site owner can't do anything about and use up their quota, hide database open
     * errors.
     */
    event.preventDefault();
    const error = event.target.error;
    if (Utils.contains(error.message, 'The operation failed for reasons unrelated to the database itself and not covered by any other error code') ||
      Utils.contains(error.message, 'A mutation operation was attempted on a database that did not allow mutations')) {
      Log.warn("OneSignal: IndexedDb web storage is not available on this origin since this profile's IndexedDb schema has been upgraded in a newer version of Firefox. See: https://bugzilla.mozilla.org/show_bug.cgi?id=1236557#c6");
    } else {
      Log.warn('OneSignal: Fatal error opening IndexedDb database:', error);
    }
  }

  /**
   * Error events bubble. Error events are targeted at the request that generated the error, then the event bubbles to
   * the transaction, and then finally to the database object. If you want to avoid adding error handlers to every
   * request, you can instead add a single error handler on the database object.
   */
  private onDatabaseError(event: any) {
    Log.debug('IndexedDb: Generic database error', event.target.errorCode);
  }

  /**
   * Occurs when the upgradeneeded should be triggered because of a version change but the database is still in use
   * (that is, not closed) somewhere, even after the versionchange event was sent.
   */
  private onDatabaseOpenBlocked(): void {
    Log.debug('IndexedDb: Blocked event');
  }

  /**
   * Occurs when a database structure change (IDBOpenDBRequest.onupgradeneeded event or IDBFactory.deleteDatabase) was
   * requested elsewhere (most probably in another window/tab on the same computer).
   *
   * versionchange Algorithm: https://www.w3.org/TR/IndexedDB/#h-versionchange-transaction-steps
   *
   * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/onversionchange
   */
  private onDatabaseVersionChange(_: IDBVersionChangeEvent): void {
    Log.debug('IndexedDb: versionchange event');
  }

  /**
   * Occurs when a new version of the database needs to be created, or has not been created before, or a new version
   * of the database was requested to be opened when calling window.indexedDB.open.
   *
   * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onupgradeneeded
   */
  private onDatabaseUpgradeNeeded(event: IDBVersionChangeEvent): void {
    Log.debug('IndexedDb: Database is being rebuilt or upgraded (upgradeneeded event).');
    const db = (event.target as IDBOpenDBRequest).result;
    db.createObjectStore("Ids", { keyPath: "type" });
    db.createObjectStore("NotificationOpened", { keyPath: "url" });
    db.createObjectStore("Options", { keyPath: "key" });
    db.createObjectStore("Sessions", { keyPath: "sessionKey" });

    db.createObjectStore("NotificationReceived", { keyPath: "notificationId" });
    db.createObjectStore("NotificationClicked", { keyPath: "notificationId" });
    // Wrap in conditional for tests
    if (typeof OneSignal !== "undefined") {
      OneSignal._isNewVisitor = true;
    }
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  public async get(table: string, key?: string): Promise<any> {
    const database = await this.ensureDatabaseOpen();
    if (key) {
      // Return a table-key value
      return await new Promise((resolve, reject) => {
        var request: IDBRequest = database.transaction(table).objectStore(table).get(key);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } else {
      // Return all values in table
      return await new Promise((resolve, reject) => {
        let jsonResult: {[key: string]: any} = {};
        let cursor = database.transaction(table).objectStore(table).openCursor();
        cursor.onsuccess = (event: any) => {
          var cursorResult: IDBCursorWithValue = event.target.result;
          if (cursorResult) {
            let cursorResultKey: string = cursorResult.key as string;
            jsonResult[cursorResultKey] = cursorResult.value;
            cursorResult.continue();
          } else {
            resolve(jsonResult);
          }
        };
        cursor.onerror = () => {
          reject(cursor.error);
        };
      });
    }
  }

  public async getAll<T>(table: string): Promise<T[]> {
    return await new Promise<T[]>(async (resolve, reject) => {
      const database = await this.ensureDatabaseOpen();
      let cursor = database.transaction(table).objectStore(table).openCursor();
      const result: T[] = [];
      cursor.onsuccess = (event: any) => {
        var cursorResult: IDBCursorWithValue = event.target.result;
        if (cursorResult) {
          result.push(cursorResult.value as T);
          cursorResult.continue();
        } else {
          resolve(result);
        }
      };
      cursor.onerror = () => {
        reject(cursor.error);
      };
    });
  }

  public async queryFromIndex<T, TKey>(table: string, indexName: string, key?: TKey): Promise<T[]> {
    const database = await this.ensureDatabaseOpen();
    return await new Promise<T[]>((resolve, reject) => {
      const result: T[] = [];

      // Match anything up to, including the key
      var lowerBoundOpenKeyRange = IDBKeyRange.lowerBound(key);
      const indexCursor = database.transaction(table).objectStore(table)
        .index(indexName).openCursor(lowerBoundOpenKeyRange);
      indexCursor.onsuccess = (event: any) => {
        let cursorResult: IDBCursorWithValue = event.target.result;
        if (cursorResult) {
          result.push(cursorResult.value as T);
          cursorResult.continue();
        }
        resolve(result);
      };
      indexCursor.onerror = () => {
        reject(indexCursor.error);
      };
    });
    
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   */
  public async put(table: string, key: any) {
    await this.ensureDatabaseOpen();
    return await new Promise((resolve, reject) => {
      try {
        let request = this.database!.transaction([table], 'readwrite').objectStore(table).put(key);
        request.onsuccess = () => {
          resolve(key);
        };
        request.onerror = (e) => {
          Log.error('Database PUT Transaction Error:', e);
          reject(e);
        };
      } catch (e) {
        Log.error('Database PUT Error:', e);
        reject(e);
      }
    });
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  public async remove(table: string, key?: string) {
    const database = await this.ensureDatabaseOpen();
    return new Promise((resolve, reject) => {
      try {
        const store = database.transaction([table], "readwrite").objectStore(table);
        // If key is present remove a single key from a table.
        // Otherwise wipe the table
        const request = key ? store.delete(key) : store.clear();
        request.onsuccess = () => {
          resolve(key);
        };
        request.onerror = (e) => {
          Log.error('Database REMOVE Transaction Error:', e);
          reject(e);
        };
      } catch (e) {
        Log.error('Database REMOVE Error:', e);
        reject(e);
      }
    });
  }
}
