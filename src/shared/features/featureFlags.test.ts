import { APP_ID } from '__test__/constants';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { getFeatureFlags, getFeatureOverrides, setFeatureFlags } from '../helpers/localStorage';
import Log from '../libraries/Log';
import { FeatureFlag, isFeatureEnabled, refreshFeatureFlags } from './featureFlags';

const FLAG = FeatureFlag._IdentityVerification;
const FEATURES_PATH = `**/apps/${APP_ID}/sdk/features/web/*`;

const mockFeatures = (body: Record<string, unknown>, status = 200) =>
  server.use(http.get(FEATURES_PATH, () => HttpResponse.json(body, { status })));

describe('featureFlags', () => {
  const warnSpy = vi.spyOn(Log, '_warn').mockImplementation(() => '');

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    warnSpy.mockClear();
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

    test('warns when local overrides are set', async () => {
      localStorage.setItem('os_feature_overrides', FLAG);
      mockFeatures({ features: [] });

      await refreshFeatureFlags(APP_ID);

      expect(warnSpy).toHaveBeenCalledWith('Feature flag overrides are active:', [FLAG]);
      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    test('does not warn when no overrides are set', async () => {
      mockFeatures({ features: [] });

      await refreshFeatureFlags(APP_ID);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
