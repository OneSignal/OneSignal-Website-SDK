import Log from '../libraries/Log';
import { ONESIGNAL_SESSION_KEY } from '../session/constants';
import { IS_SERVICE_WORKER } from '../utils/env';
import { DATABASE_NAME, VERSION } from './constants';
import { openDB, wrapDb } from './idb-lite';
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
        void migrateOutcomesNotificationClickedTableForV5(_db, transaction);
        void migrateOutcomesNotificationReceivedTableForV5(_db, transaction);
      }

      if (newDbVersion >= 6 && oldVersion < 6) {
        void migrateModelNameSubscriptionsTableForV6(_db, transaction);
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
        void getDb();
      }
    },
  });
  return wrapDb<IndexedDBSchema>(raw);
};

export let dbPromise = open();
export const getDb = (version = VERSION) => {
  dbPromise = open(version);
  return dbPromise;
};

// On iOS Safari PWA after a push subscription, a `readwrite` request can stall
// indefinitely (no success/error/abort). Our timeout makes the JS promise
// resolve, but the underlying IndexedDB transaction stays open and blocks every
// later operation queued behind it on that object store -- including reads. So
// guarding writes alone isn't enough: once a write wedges, the next read of the
// same store (e.g. Options) hangs too, stalling `OneSignal.init()` until
// WebKit's watchdog aborts the txn (~30 minutes). Workaround: cap every op with
// a short timeout, trip a page-scoped circuit breaker on the first stall, then
// short-circuit all subsequent ops (reads included). Dropped writes are session
// metadata the SW re-derives or idempotent queued operations retried next load;
// dropped reads fall back to the in-memory model state hydrated before the
// wedge. Remove if WebKit ever fixes it: https://bugs.webkit.org/show_bug.cgi?id=315804
const DB_TIMEOUT_MS = 1500;
let dbWedged = false;

export const isReadwriteWedged = () => dbWedged;

// `op` is invoked synchronously (callers await `dbPromise` first), so the
// timeout scopes only to the request, not DB open/upgrade.
function guard<T>(label: string, op: () => Promise<T>, fallback: T): Promise<T> {
  if (dbWedged) return Promise.resolve(fallback);
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      dbWedged = true;
      Log._warn(`db.${label} timed out`);
      resolve(fallback);
    }, DB_TIMEOUT_MS);
  });
  return Promise.race([op(), timeout]).finally(() => clearTimeout(timer));
}

export const db = {
  async get<K extends IDBStoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ): Promise<IndexedDBSchema[K]['value'] | undefined> {
    const _db = await dbPromise;
    return guard(`get(${storeName})`, () => _db.get(storeName, key), undefined);
  },
  async getAll<K extends IDBStoreName>(storeName: K): Promise<IndexedDBSchema[K]['value'][]> {
    const _db = await dbPromise;
    return guard<IndexedDBSchema[K]['value'][]>(
      `getAll(${storeName})`,
      () => _db.getAll(storeName),
      [],
    );
  },
  async put<K extends IDBStoreName>(storeName: K, value: IndexedDBSchema[K]['value']) {
    const _db = await dbPromise;
    return guard(`put(${storeName})`, () => _db.put(storeName, value), undefined);
  },
  async delete<K extends IDBStoreName>(storeName: K, key: IndexedDBSchema[K]['key']) {
    const _db = await dbPromise;
    return guard(`delete(${storeName}/${key})`, () => _db.delete(storeName, key), undefined);
  },
};

export const clearStore = async <K extends IDBStoreName>(storeName: K) => {
  const _db = await dbPromise;
  return guard(`clear(${storeName})`, () => _db.clear(storeName), undefined);
};

export const getObjectStoreNames = async () => {
  return Array.from((await dbPromise).objectStoreNames) as IDBStoreName[];
};

export const getOptionsValue = async <T>(key: OptionKey): Promise<T | null> => {
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
  for (const name of await getObjectStoreNames()) {
    await clearStore(name);
  }
};

export const closeDb = async () => {
  (await dbPromise).close();
};
