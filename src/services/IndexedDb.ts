import * as log from "loglevel";
import Database from "./Database";
import {LogUtil} from "../utils/logging/LogUtil";
import Emitter from "../libraries/Emitter";

export default class IndexedDb {

  public emitter: Emitter;
  private database: IDBDatabase;
  private openLock: Promise<IDBDatabase>;

  constructor(private databaseName: string) {
    this.emitter = new Emitter();
  }

  private async open(databaseName: string): Promise<IDBDatabase> {
    return await new Promise<IDBDatabase>((resolve, reject) => {
      try {
        // Open algorithm: https://www.w3.org/TR/IndexedDB/#h-opening
        var request: IDBOpenDBRequest = indexedDB.open(databaseName, 1);
      } catch (e) {
        // Errors should be thrown on the request.onerror event, but just in case Firefox throws additional errors
        // for profile schema too high
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

  private async ensureDatabaseOpen() {
    if (!this.openLock) {
      this.openLock = this.open(this.databaseName);
    }
    await this.openLock;
    return this.database;
  }

  private onDatabaseOpenError() {
    log.debug(...LogUtil.format('Database', 'specific database open error event'));
  }

  /**
   * Error events bubble. Error events are targeted at the request that generated the error, then the event bubbles to
   * the transaction, and then finally to the database object. If you want to avoid adding error handlers to every
   * request, you can instead add a single error handler on the database object.
   */
  private onDatabaseError(event) {
    log.debug(...LogUtil.format('Database', 'Generic database error', event.target.errorCode));
  }

  /**
   * Occurs when the upgradeneeded should be triggered because of a version change but the database is still in use
   * (that is, not closed) somewhere, even after the versionchange event was sent.
   */
  private onDatabaseOpenBlocked(): void {
    log.debug(...LogUtil.format('Database', 'blocked event'));
  }

  /**
   * Occurs when a database structure change (IDBOpenDBRequest.onupgradeneeded event or IDBFactory.deleteDatabase) was
   * requested elsewhere (most probably in another window/tab on the same computer).
   *
   * versionchange Algorithm: https://www.w3.org/TR/IndexedDB/#h-versionchange-transaction-steps
   *
   * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/onversionchange
   */
  private onDatabaseVersionChange(event: IDBVersionChangeEvent): void {
    log.debug(...LogUtil.format('Database', 'versionchange event'));
  }

  /**
   * Occurs when a new version of the database needs to be created, or has not been created before, or a new version
   * of the database was requested to be opened when calling window.indexedDB.open.
   *
   * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onupgradeneeded
   */
  private onDatabaseUpgradeNeeded(event: IDBVersionChangeEvent): void {
    log.debug(...LogUtil.format('Database', 'IndexedDb is being rebuilt or upgraded (upgradeneeded event).'));
    const db = (event.target as IDBOpenDBRequest).result;
    db.createObjectStore("Ids", {
      keyPath: "type"
    });
    db.createObjectStore("NotificationOpened", {
      keyPath: "url"
    });
    db.createObjectStore("Options", {
      keyPath: "key"
    });
    /*
     TODO: Database rebuilt event for bell prenotify badge

     The event needs to be triggered across HTTP and HTTPS
     Original Code: Event.trigger('dbRebuilt', null, null);
     */
    //this.emitter.emit(Events.DB_REBUILT);
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  public async get(table: string, key?: string): Promise<any> {
    await this.ensureDatabaseOpen();
    if (key) {
      // Return a table-key value
      return await new Promise((resolve, reject) => {
        var request: IDBRequest = this.database.transaction(table).objectStore(table).get(key);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = e => {
          reject(request.error);
        };
      });
    } else {
      // Return all values in table
      return await new Promise((resolve, reject) => {
        let jsonResult = {};
        let cursor = this.database.transaction(table).objectStore(table).openCursor();
        cursor.onsuccess = (event: any) => {
          var cursorResult: IDBCursorWithValue = event.target.result;
          if (cursorResult) {
            let cursorResultKey: any = cursorResult.key;
            jsonResult[cursorResultKey] = cursorResult.value;
            cursorResult.continue();
          } else {
            resolve(jsonResult);
          }
        };
        cursor.onerror = (event) => {
          reject(cursor.error);
        };
      });
    }
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   */
  public async put(table: string, key: any) {
    await this.ensureDatabaseOpen();
    return await new Promise((resolve, reject) => {
      try {
        let request = this.database.transaction([table], 'readwrite').objectStore(table).put(key);
        request.onsuccess = (event) => {
          resolve(key);
        };
        request.onerror = (e) => {
          log.error('Database PUT Transaction Error:', e);
          reject(e);
        };
      } catch (e) {
        log.error('Database PUT Error:', e);
        reject(e);
      }
    });
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  public async remove(table: string, key?: string) {
    if (key) {
      // Remove a single key from a table
      var method = "delete";
    } else {
      // Remove all keys from the table (wipe the table)
      var method = "clear";
    }
    return new Promise((resolve, reject) => {
      try {
        let request = this.database.transaction([table], 'readwrite').objectStore(table)[method](key);
        request.onsuccess = (event) => {
          resolve(key);
        };
        request.onerror = (e) => {
          log.error('Database REMOVE Transaction Error:', e);
          reject(e);
        };
      } catch (e) {
        log.error('Database REMOVE Error:', e);
        reject(e);
      }
    });
  }
}