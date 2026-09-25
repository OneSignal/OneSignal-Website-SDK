import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Log from 'src/shared/libraries/Log';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import CoreModule from './CoreModule';
import { CoreModuleDirector } from './CoreModuleDirector';
import { JwtTokenStore } from './JwtTokenStore';

const KEY = 'os_jwt_tokens';
const readPersisted = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');

describe('JwtTokenStore', () => {
  const warnSpy = vi.spyOn(Log, '_warn').mockImplementation(() => '');
  let store: JwtTokenStore;

  beforeEach(() => {
    localStorage.clear();
    store = new JwtTokenStore();
  });

  afterEach(() => {
    warnSpy.mockClear();
  });

  describe('get, put, invalidate', () => {
    test('getJwt returns undefined for an externalId never stored', () => {
      expect(store._getJwt('nobody')).toBeUndefined();
    });

    test('putJwt stores a token retrievable by externalId', () => {
      store._putJwt('alice', 'jwt-a');
      expect(store._getJwt('alice')).toBe('jwt-a');
    });

    test('putJwt replaces an existing token for the same externalId', () => {
      store._putJwt('alice', 'jwt-a1');
      store._putJwt('alice', 'jwt-a2');
      expect(store._getJwt('alice')).toBe('jwt-a2');
    });

    test('putJwt with null or undefined is a no-op', () => {
      store._putJwt('alice', 'jwt-a');
      store._putJwt('alice', null);
      store._putJwt('alice', undefined);
      expect(store._getJwt('alice')).toBe('jwt-a');
    });

    test('invalidateJwt removes the token for externalId', () => {
      store._putJwt('alice', 'jwt-a');
      store._invalidateJwt('alice');
      expect(store._getJwt('alice')).toBeUndefined();
    });

    test('invalidateJwt on an absent externalId is a no-op', () => {
      expect(() => store._invalidateJwt('nobody')).not.toThrow();
      expect(readPersisted()).toBeNull();
    });

    test.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
      'externalId %s does not collide with Object.prototype',
      (externalId) => {
        const listener = vi.fn();
        store._addUserJwtInvalidatedListener(listener);

        expect(store._getJwt(externalId)).toBeUndefined();
        store._invalidateJwt(externalId);
        expect(listener).not.toHaveBeenCalled();

        store._putJwt(externalId, 'jwt-x');
        expect(store._getJwt(externalId)).toBe('jwt-x');
        expect(new JwtTokenStore()._getJwt(externalId)).toBe('jwt-x');
        expect(new JwtTokenStore()._getJwt('other')).toBeUndefined();
      },
    );
  });

  describe('persistence', () => {
    test('putJwt persists so a fresh instance recovers the token', () => {
      store._putJwt('alice', 'jwt-a');
      expect(new JwtTokenStore()._getJwt('alice')).toBe('jwt-a');
    });

    test('invalidateJwt persists so a fresh instance does not see the token', () => {
      store._putJwt('alice', 'jwt-a');
      store._invalidateJwt('alice');
      expect(new JwtTokenStore()._getJwt('alice')).toBeUndefined();
    });

    test('persisted JSON is one object keyed by externalId', () => {
      store._putJwt('alice', 'jwt-a');
      store._putJwt('bob', 'jwt-b');
      expect(readPersisted()).toEqual({ alice: 'jwt-a', bob: 'jwt-b' });
    });

    test('malformed persisted JSON warns, deletes the value, and starts fresh', () => {
      localStorage.setItem(KEY, '{not json');
      const fresh = new JwtTokenStore();

      expect(fresh._getJwt('alice')).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(localStorage.getItem(KEY)).toBeNull();

      fresh._putJwt('alice', 'jwt-a');
      expect(readPersisted()).toEqual({ alice: 'jwt-a' });
    });

    test('a failed write warns and keeps the token in memory for this session', () => {
      const listener = vi.fn();
      store._addUpdateListener(listener);
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

      expect(() => store._putJwt('alice', 'jwt-a')).not.toThrow();
      setItem.mockRestore();

      expect(store._getJwt('alice')).toBe('jwt-a');
      expect(listener).toHaveBeenCalledExactlyOnceWith('alice');
      expect(warnSpy).toHaveBeenCalledWith(
        'JwtTokenStore: failed to persist tokens',
        expect.anything(),
      );
      expect(readPersisted()).toBeNull();
    });

    test('non-object or non-string entries are dropped on load', () => {
      localStorage.setItem(KEY, JSON.stringify(['jwt-a']));
      expect(new JwtTokenStore()._getJwt('0')).toBeUndefined();

      localStorage.setItem(KEY, JSON.stringify({ alice: 'jwt-a', bob: 1 }));
      const fresh = new JwtTokenStore();
      expect(fresh._getJwt('alice')).toBe('jwt-a');
      expect(fresh._getJwt('bob')).toBeUndefined();
    });
  });

  describe('prune', () => {
    test('pruneToExternalIds removes tokens whose externalId is not in the active set', () => {
      store._putJwt('alice', 'jwt-a');
      store._putJwt('bob', 'jwt-b');
      store._putJwt('carol', 'jwt-c');

      store._pruneToExternalIds(['bob']);

      expect(store._getJwt('alice')).toBeUndefined();
      expect(store._getJwt('bob')).toBe('jwt-b');
      expect(store._getJwt('carol')).toBeUndefined();
      expect(readPersisted()).toEqual({ bob: 'jwt-b' });
    });

    test('pruneToExternalIds fires the internal listener for each removed externalId', () => {
      store._putJwt('alice', 'jwt-a');
      store._putJwt('bob', 'jwt-b');
      const removed: string[] = [];
      store._addUpdateListener((id) => removed.push(id));

      store._pruneToExternalIds(new Set<string>());

      expect(removed.sort()).toEqual(['alice', 'bob']);
    });

    test('pruneToExternalIds with nothing to remove does not persist or notify', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addUpdateListener(listener);
      const before = localStorage.getItem(KEY);

      store._pruneToExternalIds(['alice']);

      expect(listener).not.toHaveBeenCalled();
      expect(localStorage.getItem(KEY)).toBe(before);
    });
  });

  describe('internal update listeners', () => {
    test('fire when a new JWT is put', () => {
      const listener = vi.fn();
      store._addUpdateListener(listener);

      store._putJwt('alice', 'jwt-a');

      expect(listener).toHaveBeenCalledExactlyOnceWith('alice');
    });

    test('do not fire when putJwt does not change the stored token', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addUpdateListener(listener);

      store._putJwt('alice', 'jwt-a');

      expect(listener).not.toHaveBeenCalled();
    });

    test('do not fire on invalidateJwt', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addUpdateListener(listener);

      store._invalidateJwt('alice');

      expect(listener).not.toHaveBeenCalled();
    });

    test('an unsubscribed listener is not notified', () => {
      const listener = vi.fn();
      store._addUpdateListener(listener);
      store._removeUpdateListener(listener);

      store._putJwt('alice', 'jwt-a');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('public invalidated listeners', () => {
    test('fire with the externalId on invalidateJwt', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addUserJwtInvalidatedListener(listener);

      store._invalidateJwt('alice');

      expect(listener).toHaveBeenCalledExactlyOnceWith({ externalId: 'alice' });
    });

    test('are not notified when invalidating a token that does not exist', () => {
      const listener = vi.fn();
      store._addUserJwtInvalidatedListener(listener);

      store._invalidateJwt('nobody');

      expect(listener).not.toHaveBeenCalled();
    });

    test('a throwing listener is isolated and the others still fire', () => {
      store._putJwt('alice', 'jwt-a');
      const bad = vi.fn(() => {
        throw new Error('boom');
      });
      const good = vi.fn();
      store._addUserJwtInvalidatedListener(bad);
      store._addUserJwtInvalidatedListener(good);

      expect(() => store._invalidateJwt('alice')).not.toThrow();

      expect(good).toHaveBeenCalledExactlyOnceWith({ externalId: 'alice' });
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(store._getJwt('alice')).toBeUndefined();
    });

    test('a late subscriber does not receive earlier events', () => {
      store._putJwt('alice', 'jwt-a');
      store._invalidateJwt('alice');

      const late = vi.fn();
      store._addUserJwtInvalidatedListener(late);

      expect(late).not.toHaveBeenCalled();
    });

    test('a removed listener stops further notifications', () => {
      store._putJwt('alice', 'jwt-a');
      store._putJwt('bob', 'jwt-b');
      const listener = vi.fn();
      store._addUserJwtInvalidatedListener(listener);

      store._invalidateJwt('alice');
      store._removeUserJwtInvalidatedListener(listener);
      store._invalidateJwt('bob');

      expect(listener).toHaveBeenCalledExactlyOnceWith({ externalId: 'alice' });
    });

    test('a listener that removes itself during the event does not skip the next listener', () => {
      store._putJwt('alice', 'jwt-a');
      const once = vi.fn(() => store._removeUserJwtInvalidatedListener(once));
      const second = vi.fn();
      store._addUserJwtInvalidatedListener(once);
      store._addUserJwtInvalidatedListener(second);

      store._invalidateJwt('alice');

      expect(once).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledExactlyOnceWith({ externalId: 'alice' });
    });

    test('a listener that puts a new token during the event sees the removal first', () => {
      store._putJwt('alice', 'jwt-old');
      const seen: (string | undefined)[] = [];
      store._addUserJwtInvalidatedListener(({ externalId }) => {
        seen.push(store._getJwt(externalId));
        store._putJwt(externalId, 'jwt-new');
      });

      store._invalidateJwt('alice');

      expect(seen).toEqual([undefined]);
      expect(store._getJwt('alice')).toBe('jwt-new');
    });
  });

  // jsdom does not deliver storage events between windows, so a synthetic event
  // stands in for the one the browser fires in every other tab after a write.
  describe('cross-tab sync', () => {
    const remoteChange = (key: string | null = KEY) =>
      window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }));

    test('a token put in another tab is visible after the storage event', () => {
      const otherTab = new JwtTokenStore();
      expect(store._getJwt('alice')).toBeUndefined();

      otherTab._putJwt('alice', 'jwt-a');
      remoteChange();

      expect(store._getJwt('alice')).toBe('jwt-a');
    });

    test('a token invalidated in another tab is removed without a second invalidated event', () => {
      store._putJwt('alice', 'jwt-a');
      const otherTab = new JwtTokenStore();
      const invalidated = vi.fn();
      store._addUserJwtInvalidatedListener(invalidated);

      otherTab._invalidateJwt('alice');
      remoteChange();

      expect(store._getJwt('alice')).toBeUndefined();
      expect(invalidated).not.toHaveBeenCalled();
    });

    test('a storage event for another key leaves the in-memory copy alone', () => {
      store._putJwt('alice', 'jwt-a');
      localStorage.setItem(KEY, JSON.stringify({ alice: 'jwt-remote' }));

      remoteChange('some_other_key');
      expect(store._getJwt('alice')).toBe('jwt-a');

      remoteChange();
      expect(store._getJwt('alice')).toBe('jwt-remote');
    });

    test('localStorage.clear() in another tab drops the in-memory copy', () => {
      store._putJwt('alice', 'jwt-a');
      localStorage.clear();

      remoteChange(null);

      expect(store._getJwt('alice')).toBeUndefined();
    });
  });

  describe('CoreModule wiring', () => {
    beforeEach(() => {
      TestEnvironment.initialize();
    });

    test('the director exposes the store', async () => {
      const core = new CoreModule();
      await core._init();

      expect(new CoreModuleDirector(core)._jwtTokenStore).toBe(core._jwtTokenStore);
    });
  });
});
