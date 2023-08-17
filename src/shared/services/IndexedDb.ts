
import { ModelName } from '../../core/models/SupportedModels';
import Utils from '../context/Utils';
import Emitter from '../libraries/Emitter';
import Log from '../libraries/Log';

export default class IndexedDb {
  public emitter: Emitter;
  private database: IDBDatabase | undefined;
  private openLock: Promise<IDBDatabase> | undefined;

  constructor(
    private readonly databaseName: string,
    private readonly dbVersion = 5,
  ) {
    this.emitter = new Emitter();
  }

  private open(databaseName: string): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>(resolve => {
      let request: IDBOpenDBRequest | undefined = undefined;
      try {
        // Open algorithm: https://www.w3.org/TR/IndexedDB/#h-opening
        request = indexedDB.open(databaseName, this.dbVersion);
      } catch (e) {
        // Errors should be thrown on the request.onerror event, but just in case Firefox throws additional errors
        // for profile schema too high
      }
      if (!request) {
        return null;
      }
      request.onerror = this.onDatabaseOpenError.bind(this);
      request.onblocked = this.onDatabaseOpenBlocked.bind(this);
      request.onupgradeneeded = this.onDatabaseUpgradeNeeded.bind(this);
      request.onsuccess = () => {
        this.database = request.result;
        this.database.onerror = this.onDatabaseError;
        this.database.onversionchange = this.onDatabaseVersionChange;
        resolve(this.database);
      };
    });
  }

  public async close(): Promise<void> {
    // TODO:CLEANUP: Seems we have always had two DB connections open
    // one could be delete to clean this up.
    const dbLock = await this.ensureDatabaseOpen();
    dbLock.close();
    this.database?.close();
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
    const target = event.target as IDBOpenDBRequest;
    const transaction = target.transaction;
    if (!transaction) {
      throw Error("Can't migrate DB without a transaction");
    }
    const db = target.result;
    const newDbVersion = event.newVersion || Number.MAX_SAFE_INTEGER;
    if (newDbVersion >= 1 && event.oldVersion < 1) {
      db.createObjectStore("Ids", { keyPath: "type" });
      db.createObjectStore("NotificationOpened", { keyPath: "url" });
      db.createObjectStore("Options", { keyPath: "key" });
    }
    if (newDbVersion >= 2 && event.oldVersion < 2) {
      db.createObjectStore("Sessions", { keyPath: "sessionKey" });
      db.createObjectStore("NotificationReceived", { keyPath: "notificationId" });
      // NOTE: 160000.beta4 to 160000 releases modified this line below as
      // "{ keyPath: "notification.id" }". This resulted in DB v4 either
      // having "notificationId" or "notification.id" depending if the visitor
      // was new while this version was live.
      // DB v5 was create to trigger a migration to fix this bug.
      db.createObjectStore("NotificationClicked", { keyPath: "notificationId" });
    }
    if (newDbVersion >= 3 && event.oldVersion < 3) {
      db.createObjectStore("SentUniqueOutcome", { keyPath: "outcomeName" });
    }
    if (newDbVersion >= 4 && event.oldVersion < 4) {
      db.createObjectStore(ModelName.Identity, { keyPath: "modelId" });
      db.createObjectStore(ModelName.Properties, { keyPath: "modelId" });
      db.createObjectStore(ModelName.PushSubscriptions, { keyPath: "modelId" });
      db.createObjectStore(ModelName.SmsSubscriptions, { keyPath: "modelId" });
      db.createObjectStore(ModelName.EmailSubscriptions, { keyPath: "modelId" });
    }
    if (newDbVersion >= 5 && event.oldVersion < 5) {
      this.migrateOutcomesNotificationClickedTableForV5(db, transaction);
      this.migrateOutcomesNotificationReceivedTableForV5(db, transaction);
    }
    if (newDbVersion >= 6 && event.oldVersion < 6) {
      // Make sure to update the database version at the top of the file
    }
    // Wrap in conditional for tests
    if (typeof OneSignal !== "undefined") {
      OneSignal._isNewVisitor = true;
    }
  }

  // Table rename "NotificationClicked" -> "Outcomes.NotificationClicked"
  // and migrate existing records.
  // Motivation: This is done to correct the keyPath, you can't change it
  // so a new table must be created.
  // Background: Table was created with wrong keyPath of "notification.id"
  // for new visitors for versions 160000.beta4 to 160000. Writes were
  // attempted as "notificationId" in released 160000 however they may
  // have failed if the visitor was new when those releases were in the wild.
  // However those new on 160000.beta4 to 160000.beta8 will have records
  // saved as "notification.id" that will be converted here.
  private migrateOutcomesNotificationClickedTableForV5(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const newTableName = "Outcomes.NotificationClicked";
    db.createObjectStore(newTableName, { keyPath: "notificationId" });

    const oldTableName = "NotificationClicked"
    const cursor = transaction.objectStore(oldTableName).openCursor();
    cursor.onsuccess = (event: any) => { // Using any here as the TypeScript definition is wrong
      const cursorResult = event.target.result as IDBCursorWithValue;
      if (!cursorResult) {
        // Delete old table once we have gone through all records
        db.deleteObjectStore(oldTableName);
        return;
      }
      const oldValue = cursorResult.value;
      transaction
        .objectStore(newTableName)
        .put({
          // notification.id was possible from 160000.beta4 to 160000.beta8
          notificationId: oldValue.notificationId || oldValue.notification.id,
          appId: oldValue.appId,
          timestamp: oldValue.timestamp,
        });
      cursorResult.continue();
    };
    cursor.onerror = () => { throw cursor.error; };
  }

  // Table rename "NotificationReceived" -> "Outcomes.NotificationReceived"
  // and migrate existing records.
  // Motivation: Consistency of using pre-fix "Outcomes." like we have for
  // the "Outcomes.NotificationClicked" table.
  private migrateOutcomesNotificationReceivedTableForV5(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const newTableName = "Outcomes.NotificationReceived";
    db.createObjectStore(newTableName, { keyPath: "notificationId" });

    const oldTableName = "NotificationReceived"
    const cursor = transaction.objectStore(oldTableName).openCursor();
    cursor.onsuccess = (event: any) => { // Using any here as the TypeScript definition is wrong
      const cursorResult = event.target.result as IDBCursorWithValue;
      if (!cursorResult) {
        // Delete old table once we have gone through all records
        db.deleteObjectStore(oldTableName);
        return;
      }
      transaction
        .objectStore(newTableName)
        .put(cursorResult.value);
      cursorResult.continue();
    };
    cursor.onerror = () => { throw cursor.error; };
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table
   * (if key is not specified).
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  public async get(table: string, key?: string): Promise<any> {
    const database = await this.ensureDatabaseOpen();
    if (key) {
      // Return a table-key value
      return await new Promise((resolve, reject) => {
        const request: IDBRequest = database.transaction(table).objectStore(table).get(key);
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
        const jsonResult: {[key: string]: any} = {};
        const cursor = database.transaction(table).objectStore(table).openCursor();
        cursor.onsuccess = (event: any) => {
          const cursorResult: IDBCursorWithValue = event.target.result;
          if (cursorResult) {
            const cursorResultKey: string = cursorResult.key as string;
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
      const cursor = database.transaction(table).objectStore(table).openCursor();
      const result: T[] = [];
      cursor.onsuccess = (event: any) => {
        const cursorResult: IDBCursorWithValue = event.target.result;
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

  /**
   * Asynchronously puts the specified value in the specified table.
   */
  public async put(table: string, key: any) {
    await this.ensureDatabaseOpen();
    return await new Promise((resolve, reject) => {
      try {
        const request = this.database!.transaction([table], 'readwrite').objectStore(table).put(key);
        request.onsuccess = () => {
          resolve(key);
        };
        request.onerror = e => {
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
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes
   * all keys in the table.
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
        request.onerror =e => {
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
