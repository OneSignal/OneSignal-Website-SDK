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

    test('malformed persisted JSON warns and starts fresh', () => {
      localStorage.setItem(KEY, '{not json');
      const fresh = new JwtTokenStore();

      expect(fresh._getJwt('alice')).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledOnce();

      fresh._putJwt('alice', 'jwt-a');
      expect(readPersisted()).toEqual({ alice: 'jwt-a' });
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
      store._addInternalUpdateListener((id) => removed.push(id));

      store._pruneToExternalIds(new Set<string>());

      expect(removed.sort()).toEqual(['alice', 'bob']);
    });

    test('pruneToExternalIds with nothing to remove does not persist or notify', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addInternalUpdateListener(listener);
      const before = localStorage.getItem(KEY);

      store._pruneToExternalIds(['alice']);

      expect(listener).not.toHaveBeenCalled();
      expect(localStorage.getItem(KEY)).toBe(before);
    });
  });

  describe('internal update listeners', () => {
    test('fire when a new JWT is put', () => {
      const listener = vi.fn();
      store._addInternalUpdateListener(listener);

      store._putJwt('alice', 'jwt-a');

      expect(listener).toHaveBeenCalledExactlyOnceWith('alice');
    });

    test('do not fire when putJwt does not change the stored token', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addInternalUpdateListener(listener);

      store._putJwt('alice', 'jwt-a');

      expect(listener).not.toHaveBeenCalled();
    });

    test('do not fire on invalidateJwt', () => {
      store._putJwt('alice', 'jwt-a');
      const listener = vi.fn();
      store._addInternalUpdateListener(listener);

      store._invalidateJwt('alice');

      expect(listener).not.toHaveBeenCalled();
    });

    test('an unsubscribed listener is not notified', () => {
      const listener = vi.fn();
      store._addInternalUpdateListener(listener);
      store._removeInternalUpdateListener(listener);

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
