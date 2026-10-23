import { APP_ID } from '__test__/constants';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import * as clientModule from '../database/client';
import { db, getOptionsValue } from '../database/client';
import { getFeatureFlags, getFeatureOverrides, setFeatureFlags } from '../helpers/localStorage';
import Log from '../libraries/Log';
import {
  FeatureFlag,
  isFeatureEnabled,
  isFeatureEnabledInWorker,
  refreshFeatureFlags,
} from './featureFlags';

vi.mock('../database/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../database/client')>();
  return {
    ...actual,
    isReadwriteWedged: vi.fn(() => false),
  };
});

const FLAG = FeatureFlag._IdentityVerification;
const FEATURES_PATH = `**/apps/${APP_ID}/sdk/features/web/*`;

const mockFeatures = (body: Record<string, unknown>, status = 200) =>
  server.use(http.get(FEATURES_PATH, () => HttpResponse.json(body, { status })));

describe('featureFlags', () => {
  const warnSpy = vi.spyOn(Log, '_warn').mockImplementation(() => '');
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    warnSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  describe('isFeatureEnabled', () => {
    test('is false when nothing is cached', () => {
      expect(isFeatureEnabled(FLAG)).toBe(false);
    });

    test('is false when the cached list does not contain the flag', () => {
      setFeatureFlags(['sdk_background_threading']);
      expect(isFeatureEnabled(FLAG)).toBe(false);
    });

    test('is true when the cached list contains the flag', () => {
      setFeatureFlags([FLAG]);
      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('is true when the local override lists the flag', () => {
      localStorage.setItem('os_feature_overrides', `other_flag, ${FLAG}`);
      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('is false when the cached value is malformed', () => {
      localStorage.setItem('os_feature_flags', '{not json');
      expect(isFeatureEnabled(FLAG)).toBe(false);

      localStorage.setItem('os_feature_flags', '{"features":[]}');
      expect(isFeatureEnabled(FLAG)).toBe(false);
    });
  });

  describe('storage helpers', () => {
    test('getFeatureFlags drops non-string entries', () => {
      localStorage.setItem('os_feature_flags', JSON.stringify([FLAG, 1, null]));
      expect(getFeatureFlags()).toEqual([FLAG]);
    });

    test('getFeatureOverrides trims and drops empty entries', () => {
      localStorage.setItem('os_feature_overrides', ` a , ,b,`);
      expect(getFeatureOverrides()).toEqual(['a', 'b']);
    });
  });

  describe('refreshFeatureFlags', () => {
    test('caches the server list and applies it at once', async () => {
      mockFeatures({ features: ['sdk_background_threading', FLAG] });

      await refreshFeatureFlags(APP_ID);

      expect(getFeatureFlags()).toEqual(['sdk_background_threading', FLAG]);
      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('an empty server list turns a cached flag off', async () => {
      setFeatureFlags([FLAG]);
      mockFeatures({ features: [] });

      await refreshFeatureFlags(APP_ID);

      expect(isFeatureEnabled(FLAG)).toBe(false);
    });

    test('a non-2xx response keeps the cached list', async () => {
      setFeatureFlags([FLAG]);
      mockFeatures({ errors: ['nope'] }, 500);

      await refreshFeatureFlags(APP_ID);

      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('a malformed body keeps the cached list', async () => {
      setFeatureFlags([FLAG]);
      mockFeatures({ features: 'yes' });

      await refreshFeatureFlags(APP_ID);

      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('a non-JSON body logs a warning and keeps the cached list', async () => {
      setFeatureFlags([FLAG]);
      server.use(http.get(FEATURES_PATH, () => HttpResponse.text('<html>')));

      await refreshFeatureFlags(APP_ID);

      expect(isFeatureEnabled(FLAG)).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith('Feature flags fetch failed', expect.anything());
    });

    test('warns on the console when local overrides are set', async () => {
      localStorage.setItem('os_feature_overrides', FLAG);
      mockFeatures({ features: [] });

      await refreshFeatureFlags(APP_ID);

      expect(consoleWarnSpy).toHaveBeenCalledWith('OneSignal: feature flag overrides are active:', [
        FLAG,
      ]);
      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('does not warn when no overrides are set', async () => {
      mockFeatures({ features: [] });

      await refreshFeatureFlags(APP_ID);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    test('mirrors the server list and the overrides into IndexedDB for the worker', async () => {
      localStorage.setItem('os_feature_overrides', 'other_flag');
      mockFeatures({ features: [FLAG, 7] });

      await refreshFeatureFlags(APP_ID);

      expect(await getOptionsValue<string>('featureFlags')).toBe(
        JSON.stringify(['other_flag', FLAG]),
      );
    });

    test('keeps the page list when the worker mirror write is dropped', async () => {
      setFeatureFlags([FLAG]);
      mockFeatures({ features: [] });
      vi.mocked(clientModule.isReadwriteWedged).mockReturnValueOnce(true);

      await refreshFeatureFlags(APP_ID);

      expect(isFeatureEnabled(FLAG)).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        'Feature flags not mirrored to the worker, keeping the cached list',
      );
    });

    test('a failed fetch keeps the mirrored list', async () => {
      await db.put('Options', { key: 'featureFlags', value: JSON.stringify([FLAG]) });
      mockFeatures({ errors: ['nope'] }, 500);

      await refreshFeatureFlags(APP_ID);

      expect(await isFeatureEnabledInWorker(FLAG)).toBe(true);
    });
  });

  describe('isFeatureEnabledInWorker', () => {
    test('is false when nothing is mirrored', async () => {
      expect(await isFeatureEnabledInWorker(FLAG)).toBe(false);
    });

    test('reads the mirrored list', async () => {
      await db.put('Options', { key: 'featureFlags', value: JSON.stringify(['a', FLAG]) });
      expect(await isFeatureEnabledInWorker(FLAG)).toBe(true);
    });

    test('is false when the mirrored value is malformed', async () => {
      await db.put('Options', { key: 'featureFlags', value: '{not json' });
      expect(await isFeatureEnabledInWorker(FLAG)).toBe(false);

      await db.put('Options', { key: 'featureFlags', value: JSON.stringify({ features: [FLAG] }) });
      expect(await isFeatureEnabledInWorker(FLAG)).toBe(false);
    });
  });
});
