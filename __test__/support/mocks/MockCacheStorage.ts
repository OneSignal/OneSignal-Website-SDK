// In-memory stand-in for the Cache API, which jsdom does not provide.
// Entries keep insertion order, and `put` on an existing key moves it to the end.
export class MockCache {
  entries = new Map<string, Response>();

  match(key: string): Promise<Response | undefined> {
    return Promise.resolve(this.entries.get(key)?.clone());
  }

  put(key: string, response: Response): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, response);
    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    return Promise.resolve(this.entries.delete(key));
  }

  keys(): Promise<string[]> {
    return Promise.resolve(Array.from(this.entries.keys()));
  }
}

export class MockCacheStorage {
  caches = new Map<string, MockCache>();

  open(name: string): Promise<MockCache> {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new MockCache();
      this.caches.set(name, cache);
    }
    return Promise.resolve(cache);
  }
}

export const installMockCacheStorage = (): MockCacheStorage => {
  const storage = new MockCacheStorage();
  Object.defineProperty(globalThis, 'caches', {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
};
