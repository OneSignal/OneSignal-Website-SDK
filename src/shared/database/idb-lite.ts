export function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type SchemaLike = Record<string, { key: IDBValidKey; value: unknown }>;

export function wrapDb<S extends SchemaLike>(raw: IDBDatabase) {
  const store = (name: string, mode?: IDBTransactionMode) =>
    raw.transaction(name, mode).objectStore(name);
  return {
    get: async <K extends keyof S & string>(
      s: K,
      k: S[K]['key'],
    ): Promise<S[K]['value'] | undefined> => wrapRequest(store(s).get(k)),
    getAll: async <K extends keyof S & string>(
      s: K,
    ): Promise<S[K]['value'][]> => wrapRequest(store(s).getAll()),
    put: async <K extends keyof S & string>(s: K, v: S[K]['value']) =>
      wrapRequest(store(s, 'readwrite').put(v)),
    delete: async <K extends keyof S & string>(s: K, k: S[K]['key']) =>
      wrapRequest(store(s, 'readwrite').delete(k)),
    clear: async <K extends keyof S & string>(s: K) =>
      wrapRequest(store(s, 'readwrite').clear()),
    close: () => raw.close(),
    get objectStoreNames() {
      return raw.objectStoreNames;
    },
  };
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
        req.transaction!,
      );
    req.onsuccess = () => {
      if (callbacks?.terminated) req.result.onclose = callbacks.terminated;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => callbacks?.blocked?.();
  });
}
