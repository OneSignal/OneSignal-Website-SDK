export function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
