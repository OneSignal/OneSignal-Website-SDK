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
    close: () => raw.close(),
    get objectStoreNames() {
      return raw.objectStoreNames;
    },
  };
}

export function openDB(
  name: string,
  version: number | undefined,
  callbacks?: {
    upgrade?: (
      db: IDBDatabase,
      oldVersion: number,
      newVersion: number | null,
      tx: IDBTransaction,
    ) => void;
    blocked?: () => void;
    terminated?: () => void;
    versionchange?: () => void;
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
      const db = req.result;
      if (callbacks?.terminated) db.onclose = callbacks.terminated;
      // An open connection blocks a newer SDK's upgrade until it closes.
      db.onversionchange = () => {
        db.close();
        callbacks?.versionchange?.();
      };
      resolve(db);
    };
    // The DB was upgraded by a newer SDK (another tab, or a rollback); open it as is.
    req.onerror = () =>
      version && req.error?.name === 'VersionError'
        ? resolve(openDB(name, undefined, callbacks))
        : reject(req.error);
    req.onblocked = () => callbacks?.blocked?.();
  });
}
