import { openDB, type StoreNames } from 'idb';
import Log from '../libraries/Log';
import { ONESIGNAL_SESSION_KEY } from '../session/constants';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import {
  DATABASE_NAME,
  LegacyModelName,
  ModelName,
  VERSION,
} from './constants';
import type { IdKey, IndexedDBSchema, OptionKey } from './types';
import {
  migrateModelNameSubscriptionsTableForV6,
  migrateOutcomesNotificationClickedTableForV5,
  migrateOutcomesNotificationReceivedTableForV5,
} from './upgrade';

let dbInstance: Awaited<ReturnType<typeof openDB<IndexedDBSchema>>> | null =
  null;

export const getDb = async (version = VERSION) => {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<IndexedDBSchema>(DATABASE_NAME, version, {
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
        _db.createObjectStore(ModelName.Identity, { keyPath: 'modelId' });
        _db.createObjectStore(ModelName.Properties, { keyPath: 'modelId' });
        _db.createObjectStore(LegacyModelName.PushSubscriptions, {
          keyPath: 'modelId',
        });
        _db.createObjectStore(LegacyModelName.SmsSubscriptions, {
          keyPath: 'modelId',
        });
        _db.createObjectStore(LegacyModelName.EmailSubscriptions, {
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
        _db.createObjectStore(ModelName.Operations, { keyPath: 'modelId' });
      }

      // TODO: next version delete NotificationOpened table

      if (!IS_SERVICE_WORKER && typeof OneSignal !== 'undefined') {
        OneSignal._isNewVisitor = true;
      }
    },
    blocked() {
      Log.debug('IndexedDB: Blocked event');
    },
  });
  return dbInstance;
};

type StoreName = StoreNames<IndexedDBSchema>;

// Export db object with the same API as before
export const db = {
  async get<K extends StoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ): Promise<IndexedDBSchema[K]['value'] | undefined> {
    const _db = await getDb();
    return _db.get(storeName, key);
  },
  async getAll<K extends StoreName>(
    storeName: K,
  ): Promise<IndexedDBSchema[K]['value'][]> {
    const _db = await getDb();
    return _db.getAll(storeName);
  },
  async put<K extends StoreName>(
    storeName: K,
    value: IndexedDBSchema[K]['value'],
  ) {
    const _db = await getDb();
    return _db.put(storeName, value);
  },
  async delete<K extends StoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ) {
    const _db = await getDb();
    return _db.delete(storeName, key);
  },
  async clear<K extends StoreName>(storeName: K) {
    const _db = await getDb();
    return _db.clear(storeName);
  },
  get objectStoreNames() {
    return dbInstance?.objectStoreNames || [];
  },
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
  const objectStoreNames = db.objectStoreNames;
  for (const storeName of objectStoreNames) {
    await db.clear(storeName);
  }
};

export const closeDb = async () => {
  await dbInstance?.close();
  dbInstance = null;
};
