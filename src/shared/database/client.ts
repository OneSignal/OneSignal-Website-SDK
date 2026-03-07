import Log from '../libraries/Log';
import { ONESIGNAL_SESSION_KEY } from '../session/constants';
import { IS_SERVICE_WORKER } from '../utils/env';
import { DATABASE_NAME, VERSION } from './constants';
import { openDB, wrapRequest } from './idb-lite';
import type { IDBStoreName, IdKey, IndexedDBSchema, OptionKey } from './types';
import {
  migrateModelNameSubscriptionsTableForV6,
  migrateOutcomesNotificationClickedTableForV5,
  migrateOutcomesNotificationReceivedTableForV5,
} from './upgrade';

let terminated = false;
const open = async (version = VERSION) => {
  const raw = await openDB(DATABASE_NAME, version, {
    upgrade(_db, oldVersion, newVersion, transaction) {
      const newDbVersion = newVersion || version;
      if (newDbVersion >= 1 && oldVersion < 1) {
        _db.createObjectStore('Ids', { keyPath: 'type' });
        _db.createObjectStore('NotificationOpened', { keyPath: 'url' });
        _db.createObjectStore('Options', { keyPath: 'key' });
      }

      if (newDbVersion >= 2 && oldVersion < 2) {
        _db.createObjectStore('Sessions', { keyPath: 'sessionKey' });
        _db.createObjectStore('NotificationReceived', {
          keyPath: 'notificationId',
        });
        // NOTE: 160000.beta4 to 160000 releases modified this line below as
        // "{ keyPath: "notification.id" }". This resulted in DB v4 either
        // having "notificationId" or "notification.id" depending if the visitor
        // was new while this version was live.
        // DB v5 was created to trigger a migration to fix this bug.
        _db.createObjectStore('NotificationClicked', {
          keyPath: 'notificationId',
        });
      }

      if (newDbVersion >= 3 && oldVersion < 3) {
        _db.createObjectStore('SentUniqueOutcome', { keyPath: 'outcomeName' });
      }

      if (newDbVersion >= 4 && oldVersion < 4) {
        _db.createObjectStore('identity', { keyPath: 'modelId' });
        _db.createObjectStore('properties', { keyPath: 'modelId' });
        _db.createObjectStore('pushSubscriptions', {
          keyPath: 'modelId',
        });
        _db.createObjectStore('smsSubscriptions', {
          keyPath: 'modelId',
        });
        _db.createObjectStore('emailSubscriptions', {
          keyPath: 'modelId',
        });
      }

      if (newDbVersion >= 5 && oldVersion < 5) {
        migrateOutcomesNotificationClickedTableForV5(_db, transaction);
        migrateOutcomesNotificationReceivedTableForV5(_db, transaction);
      }

      if (newDbVersion >= 6 && oldVersion < 6) {
        migrateModelNameSubscriptionsTableForV6(_db, transaction);
      }

      if (newDbVersion >= 7 && oldVersion < 7) {
        _db.createObjectStore('operations', { keyPath: 'modelId' });
      }

      // TODO: next version delete NotificationOpened table
      terminated = false;
      if (!IS_SERVICE_WORKER && typeof OneSignal !== 'undefined') {
        OneSignal._isNewVisitor = true;
      }
    },
    blocked() {
      Log._debug('IndexedDB: Blocked event');
    },
    terminated() {
      // reopen if db was terminated
      if (!terminated) {
        terminated = true;
        getDb();
      }
    },
  });
  return raw;
};

let dbPromise = open();
export const getDb = (version = VERSION) => {
  dbPromise = open(version);
  return db;
};

const store = async (name: IDBStoreName, mode?: IDBTransactionMode) =>
  (await dbPromise).transaction(name, mode).objectStore(name);

export const db = {
  async _get<K extends IDBStoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ): Promise<IndexedDBSchema[K]['value'] | undefined> {
    return wrapRequest((await store(storeName)).get(key));
  },
  async _getAll<K extends IDBStoreName>(
    storeName: K,
  ): Promise<IndexedDBSchema[K]['value'][]> {
    return wrapRequest((await store(storeName)).getAll());
  },
  async _put<K extends IDBStoreName>(
    storeName: K,
    value: IndexedDBSchema[K]['value'],
  ) {
    return wrapRequest((await store(storeName, 'readwrite')).put(value));
  },
  async _delete<K extends IDBStoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ) {
    return wrapRequest((await store(storeName, 'readwrite')).delete(key));
  },
  async _clear<K extends IDBStoreName>(storeName: K) {
    return wrapRequest((await store(storeName, 'readwrite')).clear());
  },
};

export const getObjectStoreNames = async () => {
  return Array.from((await dbPromise).objectStoreNames) as IDBStoreName[];
};

export const getOptionsValue = async <T>(key: OptionKey): Promise<T | null> => {
  const result = await db._get('Options', key);
  if (result && 'value' in result) return result.value as T;
  return null;
};

export const getIdsValue = async <T>(key: IdKey): Promise<T | null> => {
  const result = await db._get('Ids', key);
  if (result && 'id' in result) return result.id as T;
  return null;
};

export const getCurrentSession = async () => {
  return (await db._get('Sessions', ONESIGNAL_SESSION_KEY)) ?? null;
};

export const cleanupCurrentSession = async () => {
  await db._delete('Sessions', ONESIGNAL_SESSION_KEY);
};

export const clearStore = db._clear;

export const clearAll = async () => {
  for (const name of await getObjectStoreNames()) {
    await db._clear(name);
  }
};

export const closeDb = async () => {
  (await dbPromise).close();
};
