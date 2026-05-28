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

// SDK-4336: iOS 26 Safari PWA, on the navigation back to a page after the
// user has subscribed to push, leaves the `ONE_SIGNAL_SDK_DB` database in
// a state where every `readwrite` request on the `Options` object store
// stalls indefinitely (no `success`, no `error`, no transaction lifecycle
// event). Fresh connections inherit the same per-store WebKit lock state,
// so reopening doesn't help. Reads work, and `readwrite` on other stores
// works — only `readwrite` on `Options` is poisoned.
//
// Without this guard, `OneSignal.init()` blocks on the very first Options
// `put` in `initSaveState`/`saveInitOptions` and never returns, which the
// support team has observed as init "hanging for ~30 minutes" (the time
// it eventually takes WebKit's internal watchdog to abort the wedged
// transaction).
//
// Workaround: cap `readwrite` operations on the `Options` store with a
// short timeout. On timeout, we log a warning, trip a circuit breaker
// for the rest of the page's lifetime so subsequent Options writes
// short-circuit instead of each paying the timeout, and resolve the
// promise as a no-op so init proceeds. The values that didn't get
// persisted are session metadata (`pageTitle`, `persistNotification`,
// webhook URLs, click-handler config, `lastPushToken`, `isPushEnabled`,
// etc.) that the service worker reads with sensible fallbacks if
// missing or stale.
const OPTIONS_WRITE_TIMEOUT_MS = 1500;
let optionsWriteWedged = false;

function withOptionsWriteTimeout<T>(label: string, op: () => Promise<T>): Promise<T | undefined> {
  if (optionsWriteWedged) {
    Log._warn(`[SDK-4336] db.${label} skipped; Options store is known wedged for this page.`);
    return Promise.resolve(undefined);
  }
  return new Promise<T | undefined>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      optionsWriteWedged = true;
      Log._warn(
        `[SDK-4336] db.${label} timed out after ${OPTIONS_WRITE_TIMEOUT_MS}ms; ` +
          `IndexedDB Options store is wedged (likely iOS Safari PWA after push ` +
          `subscription). Tripping circuit breaker; subsequent Options writes ` +
          `on this page will be skipped immediately.`,
      );
      resolve(undefined);
    }, OPTIONS_WRITE_TIMEOUT_MS);
    op().then(
      (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export const db = {
  async get<K extends IDBStoreName>(
    storeName: K,
    key: IndexedDBSchema[K]['key'],
  ): Promise<IndexedDBSchema[K]['value'] | undefined> {
    return (await dbPromise).get(storeName, key);
  },
  async getAll<K extends IDBStoreName>(storeName: K): Promise<IndexedDBSchema[K]['value'][]> {
    return (await dbPromise).getAll(storeName);
  },
  async put<K extends IDBStoreName>(storeName: K, value: IndexedDBSchema[K]['value']) {
    const op = async () => (await dbPromise).put(storeName, value);
    if (storeName === 'Options') {
      return withOptionsWriteTimeout(`put(${storeName})`, op);
    }
    return op();
  },
  async delete<K extends IDBStoreName>(storeName: K, key: IndexedDBSchema[K]['key']) {
    const op = async () => (await dbPromise).delete(storeName, key);
    if (storeName === 'Options') {
      return withOptionsWriteTimeout(`delete(${storeName}/${String(key)})`, op);
    }
    return op();
  },
};

export const clearStore = async <K extends IDBStoreName>(storeName: K) => {
  return (await dbPromise).clear(storeName);
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
