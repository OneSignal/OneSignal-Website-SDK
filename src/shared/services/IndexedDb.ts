import { ModelName } from 'src/core/types/models';
import { containsMatch } from '../context/helpers';
import Emitter from '../libraries/Emitter';
import Log from '../libraries/Log';

const DATABASE_VERSION = 7;

export const LegacyModelName = {
  PushSubscriptions: 'pushSubscriptions',
  EmailSubscriptions: 'emailSubscriptions',
  SmsSubscriptions: 'smsSubscriptions',
} as const;

export default class IndexedDb {
  public emitter: Emitter;
  private database: IDBDatabase | undefined;
  private openLock: Promise<IDBDatabase> | undefined;
  private readonly databaseName: string;
  private readonly dbVersion: number;

  constructor(databaseName: string, dbVersion = DATABASE_VERSION) {
    this.emitter = new Emitter();
    this.databaseName = databaseName;
    this.dbVersion = dbVersion;
  }

  private open(databaseName: string): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve) => {
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
    if (
      containsMatch(
        error.message,
        'The operation failed for reasons unrelated to the database itself and not covered by any other error code',
      ) ||
      containsMatch(
        error.message,
        'A mutation operation was attempted on a database that did not allow mutations',
      )
    ) {
      Log.warn(
        "OneSignal: IndexedDb web storage is not available on this origin since this profile's IndexedDb schema has been upgraded in a newer version of Firefox. See: https://bugzilla.mozilla.org/show_bug.cgi?id=1236557#c6",
      );
    } else {
      Log.warn('OneSignal: Fatal error opening IndexedDb database:', error);
    }
  }

  public objectStoreNames(): string[] {
    return Array.from(this.database?.objectStoreNames || []);
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
  private onDatabaseVersionChange(): void {
    Log.debug('IndexedDb: versionchange event');
  }

  /**
   * Occurs when a new version of the database needs to be created, or has not been created before, or a new version
   * of the database was requested to be opened when calling window.indexedDB.open.
   *
   * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onupgradeneeded
   */
  private onDatabaseUpgradeNeeded(event: IDBVersionChangeEvent): void {
    Log.debug(
      'IndexedDb: Database is being rebuilt or upgraded (upgradeneeded event).',
    );
    const target = event.target as IDBOpenDBRequest;
    const transaction = target.transaction;
    if (!transaction) {
      throw Error("Can't migrate DB without a transaction");
    }
    const db = target.result;
    const newDbVersion = event.newVersion || Number.MAX_SAFE_INTEGER;
    if (newDbVersion >= 1 && event.oldVersion < 1) {
      db.createObjectStore('Ids', { keyPath: 'type' });
      db.createObjectStore('NotificationOpened', { keyPath: 'url' });
      db.createObjectStore('Options', { keyPath: 'key' });
    }
    if (newDbVersion >= 2 && event.oldVersion < 2) {
      db.createObjectStore('Sessions', { keyPath: 'sessionKey' });
      db.createObjectStore('NotificationReceived', {
        keyPath: 'notificationId',
      });
      // NOTE: 160000.beta4 to 160000 releases modified this line below as
      // "{ keyPath: "notification.id" }". This resulted in DB v4 either
      // having "notificationId" or "notification.id" depending if the visitor
      // was new while this version was live.
      // DB v5 was created to trigger a migration to fix this bug.
      db.createObjectStore('NotificationClicked', {
        keyPath: 'notificationId',
      });
    }
    if (newDbVersion >= 3 && event.oldVersion < 3) {
      db.createObjectStore('SentUniqueOutcome', { keyPath: 'outcomeName' });
    }
    if (newDbVersion >= 4 && event.oldVersion < 4) {
      db.createObjectStore(ModelName.Identity, { keyPath: 'modelId' });
      db.createObjectStore(ModelName.Properties, { keyPath: 'modelId' });
      db.createObjectStore(LegacyModelName.PushSubscriptions, {
        keyPath: 'modelId',
      });
      db.createObjectStore(LegacyModelName.SmsSubscriptions, {
        keyPath: 'modelId',
      });
      db.createObjectStore(LegacyModelName.EmailSubscriptions, {
        keyPath: 'modelId',
      });
    }
    if (newDbVersion >= 5 && event.oldVersion < 5) {
      this.migrateOutcomesNotificationClickedTableForV5(db, transaction);
      this.migrateOutcomesNotificationReceivedTableForV5(db, transaction);
    }
    if (newDbVersion >= 6 && event.oldVersion < 6) {
      this.migrateModelNameSubscriptionsTableForV6(db, transaction);
    }
    if (newDbVersion >= 7 && event.oldVersion < 7) {
      db.createObjectStore(ModelName.Operations, { keyPath: 'modelId' });
    }
    // Wrap in conditional for tests
    if (typeof OneSignal !== 'undefined') {
      OneSignal._isNewVisitor = true;
    }
  }

  // Table rename "NotificationClicked" -> "Outcomes.NotificationClicked"
  // and migrate existing records.
  // Motivation: This is done to correct the keyPath, you can't change it
  // so a new table must be created.
  // Background: Table was created with wrong keyPath of "notification.id"
  // for new visitors for versions 160000.beta4 to 160000.beta8. Writes were
  // attempted as "notificationId" in released 160000 however they may
  // have failed if the visitor was new when those releases were in the wild.
  // However those new on 160000.beta4 to 160000.beta8 will have records
  // saved as "notification.id" that will be converted here.
  private migrateOutcomesNotificationClickedTableForV5(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const newTableName = 'Outcomes.NotificationClicked';
    db.createObjectStore(newTableName, { keyPath: 'notificationId' });

    const oldTableName = 'NotificationClicked';
    const cursor = transaction.objectStore(oldTableName).openCursor();
    cursor.onsuccess = () => {
      if (!cursor.result) {
        // Delete old table once we have gone through all records
        db.deleteObjectStore(oldTableName);
        return;
      }
      const oldValue = cursor.result.value;
      transaction.objectStore(newTableName).put({
        // notification.id was possible from 160000.beta4 to 160000.beta8
        notificationId: oldValue.notificationId || oldValue.notification.id,
        appId: oldValue.appId,
        timestamp: oldValue.timestamp,
      });
      cursor.result.continue();
    };
    cursor.onerror = () => {
      // If there is an error getting old records nothing we can do but
      // move on. Old table will stay around so an attempt could be made
      // later.
      console.error(
        'Could not migrate NotificationClicked records',
        cursor.error,
      );
    };
  }

  // Table rename "NotificationReceived" -> "Outcomes.NotificationReceived"
  // and migrate existing records.
  // Motivation: Consistency of using pre-fix "Outcomes." like we have for
  // the "Outcomes.NotificationClicked" table.
  private migrateOutcomesNotificationReceivedTableForV5(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const newTableName = 'Outcomes.NotificationReceived';
    db.createObjectStore(newTableName, { keyPath: 'notificationId' });

    const oldTableName = 'NotificationReceived';
    const cursor = transaction.objectStore(oldTableName).openCursor();
    cursor.onsuccess = () => {
      if (!cursor.result) {
        // Delete old table once we have gone through all records
        db.deleteObjectStore(oldTableName);
        return;
      }
      transaction.objectStore(newTableName).put(cursor.result.value);
      cursor.result.continue();
    };
    cursor.onerror = () => {
      // If there is an error getting old records nothing we can do but
      // move on. Old table will stay around so an attempt could be made
      // later.
      console.error(
        'Could not migrate NotificationReceived records',
        cursor.error,
      );
    };
  }

  private migrateModelNameSubscriptionsTableForV6(
    db: IDBDatabase,
    transaction: IDBTransaction,
  ) {
    const newTableName = ModelName.Subscriptions;
    db.createObjectStore(newTableName, { keyPath: 'modelId' });

    let currentExternalId: string;
    const identityCursor = transaction
      .objectStore(ModelName.Identity)
      .openCursor();
    identityCursor.onsuccess = () => {
      if (identityCursor.result) {
        currentExternalId = identityCursor.result.value.externalId;
      }
    };
    identityCursor.onerror = () => {
      console.error(
        'Could not find ' + ModelName.Identity + ' records',
        identityCursor.error,
      );
    };

    Object.values(LegacyModelName).forEach((oldTableName) => {
      const legacyCursor = transaction.objectStore(oldTableName).openCursor();
      legacyCursor.onsuccess = () => {
        if (!legacyCursor.result) {
          // Delete old table once we have gone through all records
          db.deleteObjectStore(oldTableName);
          return;
        }
        const oldValue = legacyCursor.result.value;

        transaction.objectStore(newTableName).put({
          ...oldValue,
          modelName: ModelName.Subscriptions,
          externalId: currentExternalId,
        });
        legacyCursor.result.continue();
      };
      legacyCursor.onerror = () => {
        // If there is an error getting old records nothing we can do but
        // move on. Old table will stay around so an attempt could be made
        // later.
        console.error(
          'Could not migrate ' + oldTableName + ' records',
          legacyCursor.error,
        );
      };
    });
  }

  private async dbOperation<T>(
    table: string,
    method: 'get' | 'getAll' | 'put' | 'delete' | 'clear',
    keyOrValue?: IDBValidKey,
  ): Promise<T> {
    const database = await this.ensureDatabaseOpen();

    return await new Promise<T>((resolve, reject) => {
      try {
        const store = database
          .transaction(
            table,
            method === 'get' || method === 'getAll' ? 'readonly' : 'readwrite',
          )
          .objectStore(table);

        const request: IDBRequest =
          method === 'getAll' || method === 'clear'
            ? store[method]()
            : store[method](keyOrValue as IDBValidKey);

        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = (e) => {
          Log.error(
            'Database ' + method.toUpperCase() + ' Transaction Error:',
            e,
          );
          reject(e);
        };
      } catch (e) {
        Log.error('Database ' + method.toUpperCase() + ' Error:', e);
        reject(e);
      }
    });
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table
   * (if key is not specified).
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  public async get(table: string, key?: string): Promise<any> {
    return key
      ? this.dbOperation(table, 'get', key)
      : this.dbOperation(table, 'getAll');
  }

  public async getAll<T>(table: string): Promise<T[]> {
    return this.dbOperation(table, 'getAll');
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   */
  public async put(table: string, value: any) {
    return this.dbOperation(table, 'put', value);
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes
   * all keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  public async remove(table: string, key?: string) {
    return key
      ? this.dbOperation(table, 'delete', key)
      : this.dbOperation(table, 'clear');
  }
}
