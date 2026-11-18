export function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function wrapDb<S extends { [K in keyof S]: { key: IDBValidKey; value: unknown } }>(
  raw: IDBDatabase,
) {
  const store = (name: string, mode?: IDBTransactionMode) =>
    raw.transaction(name, mode).objectStore(name);
  return {
    get: async <K extends keyof S & string>(
      s: K,
      k: S[K]['key'],
    ): Promise<S[K]['value'] | undefined> => wrapRequest(store(s).get(k)),
    getAll: async <K extends keyof S & string>(s: K): Promise<S[K]['value'][]> =>
      wrapRequest(store(s).getAll()),
    put: async <K extends keyof S & string>(s: K, v: S[K]['value']) =>
      wrapRequest(store(s, 'readwrite').put(v)),
    delete: async <K extends keyof S & string>(s: K, k: S[K]['key']) =>
      wrapRequest(store(s, 'readwrite').delete(k)),
    clear: async <K extends keyof S & string>(s: K) => wrapRequest(store(s, 'readwrite').clear()),
    raw,
    close: () => raw.close(),
    get objectStoreNames() {
      return raw.objectStoreNames;
    },
  };
}

/** Reads and writes in one transaction. `fn` returns undefined to leave the record as is. */
export function updateInTransaction<T>(
  raw: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
  fn: (value: T | undefined) => T | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = raw.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => {
      const next = fn(req.result as T | undefined);
      if (next !== undefined) store.put(next);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function openDB(
  name: string,
  version: number,
  callbacks?: {
    upgrade?: (
      db: IDBDatabase,
      oldVersion: number,
      newVersion: number | null,
      tx: IDBTransaction,
    ) => void;
    blocked?: () => void;
    terminated?: () => void;
  },
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (e) =>
      callbacks?.upgrade?.(
        req.result,
        e.oldVersion,
        e.newVersion,
        req.transaction!, // per indexeddb spec, transaction is always defined for onupgradeneeded
      );
    req.onsuccess = () => {
      if (callbacks?.terminated) req.result.onclose = callbacks.terminated;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => callbacks?.blocked?.();
  });
}
