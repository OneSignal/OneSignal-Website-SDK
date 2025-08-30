import { openDB } from 'idb';
import Log from '../libraries/Log';
import { ONESIGNAL_SESSION_KEY } from '../session/constants';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import { DATABASE_NAME, VERSION } from './constants';
import type { IDBStoreName, IdKey, IndexedDBSchema, OptionKey } from './types';
import {
  migrateModelNameSubscriptionsTableForV6,
  migrateOutcomesNotificationClickedTableForV5,
  migrateOutcomesNotificationReceivedTableForV5,
} from './upgrade';

let terminated = false;
const open = async (version = VERSION) => {
  return openDB<IndexedDBSchema>(DATABASE_NAME, version, {
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
      Log.debug('IndexedDB: Blocked event');
    },
    terminated() {
      // reopen if db was terminated
      if (!terminated) {
        terminated = true;
        getDb();
      }
    },
  });
};
let dbPromise = open();

export const getDb = (version = VERSION) => {
  dbPromise = open(version);
  return dbPromise;
};

// Export db object with the same API as before
export const db = {
  async get<K extends IDBStoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ): Promise<IndexedDBSchema[K]['value'] | undefined> {
    return (await dbPromise).get(storeName, key);
  },
  async getAll<K extends IDBStoreName>(
    storeName: K,
  ): Promise<IndexedDBSchema[K]['value'][]> {
    return (await dbPromise).getAll(storeName);
  },
  async put<K extends IDBStoreName>(
    storeName: K,
    value: IndexedDBSchema[K]['value'],
  ) {
    return (await dbPromise).put(storeName, value);
  },
  async delete<K extends IDBStoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ) {
    return (await dbPromise).delete(storeName, key);
  },
  async clear<K extends IDBStoreName>(storeName: K) {
    return (await dbPromise).clear(storeName);
  },
  async close() {
    return (await dbPromise).close();
  },
};

export const getObjectStoreNames = async () => {
  return Array.from((await dbPromise).objectStoreNames);
};

export const getOptionsValue = async <T extends unknown>(
  key: OptionKey,
): Promise<T | null> => {
  const result = await db.get('Options', key);
  if (result && 'value' in result) return result.value as T;
  return null;
};

export const getIdsValue = async <T>(key: IdKey): Promise<T | null> => {
  const result = await db.get('Ids', key);
  if (result && 'id' in result) return result.id as T;
  return null;
};

export const getCurrentSession = async () => {
  return (await db.get('Sessions', ONESIGNAL_SESSION_KEY)) ?? null;
};

export const cleanupCurrentSession = async () => {
  await db.delete('Sessions', ONESIGNAL_SESSION_KEY);
};

export const clearAll = async () => {
  const objectStoreNames = await getObjectStoreNames();
  for (const storeName of objectStoreNames) {
    await db.clear(storeName);
  }
};

export const closeDb = async () => {
  (await dbPromise).close();
};
