import { openDB } from 'idb';
import { ONESIGNAL_SESSION_KEY } from '../session/constants';
import {
  DATABASE_NAME,
  LegacyModelName,
  ModelName,
  VERSION,
} from './constants';
import type { IndexedDBSchema } from './types';
import {
  migrateModelNameSubscriptionsTableForV6,
  migrateOutcomesNotificationClickedTableForV5,
  migrateOutcomesNotificationReceivedTableForV5,
} from './upgrade';

let dbInstance: Awaited<ReturnType<typeof openDB<IndexedDBSchema>>> | null =
  null;

export const getDb = async () => {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<IndexedDBSchema>(DATABASE_NAME, VERSION, {
    async upgrade(_db, oldVersion, newVersion, transaction) {
      const newDbVersion = newVersion || VERSION;
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
    },
  });
  return dbInstance;
};

// Export db object with the same API as before
export const db = {
  async get(storeName: keyof IndexedDBSchema, key?: string) {
    const _db = await getDb();
    return key ? _db.get(storeName as any, key) : _db.getAll(storeName as any);
  },
  async getAll(storeName: keyof IndexedDBSchema) {
    const _db = await getDb();
    return _db.getAll(storeName as any);
  },
  async put(storeName: keyof IndexedDBSchema, value: any) {
    const _db = await getDb();
    return _db.put(storeName as any, value);
  },
  async delete(storeName: keyof IndexedDBSchema, key: string) {
    const _db = await getDb();
    return _db.delete(storeName as any, key);
  },
  async clear(storeName: keyof IndexedDBSchema) {
    const _db = await getDb();
    return _db.clear(storeName as any);
  },
  get objectStoreNames() {
    return dbInstance?.objectStoreNames || [];
  },
};

export const getCurrentSession = async () => {
  return (await db.get('Sessions', ONESIGNAL_SESSION_KEY)) ?? null;
};

export const cleanupCurrentSession = async () => {
  await db.delete('Sessions', ONESIGNAL_SESSION_KEY);
};

// check if used in non tests
export const clearAll = async () => {
  const objectStoreNames = db.objectStoreNames;
  for (const storeName of objectStoreNames) {
    await db.clear(storeName);
  }
};
