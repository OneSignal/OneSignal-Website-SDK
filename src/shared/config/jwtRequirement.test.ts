import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import * as OneSignalApi from 'src/shared/api/page';
import { getJwtRequirement, setJwtRequirement } from 'src/shared/helpers/localStorage';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { getAppConfig, getMergedConfig } from './app';
import { ConfigIntegrationKind } from './constants';
import { isJwtRequirementValue, JwtRequirement, jwtRequirementFromBoolean } from './jwtRequirement';

const userConfig = { ...TestContext.getFakeAppUserConfig(), subdomainName: '' };

const serverConfigWith = (jwtRequired?: boolean) =>
  TestContext.getFakeServerAppConfig(ConfigIntegrationKind._Custom, {
    config: { jwt_required: jwtRequired },
  });

describe('JwtRequirement', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('jwtRequirementFromBoolean', () => {
    test('maps true to required', () => {
      expect(jwtRequirementFromBoolean(true)).toBe(JwtRequirement._Required);
    });

    test('maps false to not required', () => {
      expect(jwtRequirementFromBoolean(false)).toBe(JwtRequirement._NotRequired);
    });

    test('maps null and undefined to unknown', () => {
      expect(jwtRequirementFromBoolean(null)).toBe(JwtRequirement._Unknown);
      expect(jwtRequirementFromBoolean(undefined)).toBe(JwtRequirement._Unknown);
    });
  });

  describe('isJwtRequirementValue', () => {
    test('accepts the 3 known values', () => {
      expect(isJwtRequirementValue('unknown')).toBe(true);
      expect(isJwtRequirementValue('not_required')).toBe(true);
      expect(isJwtRequirementValue('required')).toBe(true);
    });

    test('rejects other values', () => {
      expect(isJwtRequirementValue(null)).toBe(false);
      expect(isJwtRequirementValue('true')).toBe(false);
      expect(isJwtRequirementValue(1)).toBe(false);
    });
  });

  describe('getMergedConfig', () => {
    test('absent key reads as not required after a successful fetch', () => {
      const config = getMergedConfig(userConfig, serverConfigWith(undefined));
      expect(config.jwtRequired).toBe(JwtRequirement._NotRequired);
    });

    test('true reads as required', () => {
      const config = getMergedConfig(userConfig, serverConfigWith(true));
      expect(config.jwtRequired).toBe(JwtRequirement._Required);
    });

    test('false reads as not required', () => {
      const config = getMergedConfig(userConfig, serverConfigWith(false));
      expect(config.jwtRequired).toBe(JwtRequirement._NotRequired);
    });
  });

  describe('persistence', () => {
    beforeEach(() => {
      TestEnvironment.initialize();
    });

    test('reads unknown when nothing is stored', () => {
      expect(getJwtRequirement()).toBe(JwtRequirement._Unknown);
    });

    test('reads unknown when the stored value is malformed', () => {
      localStorage.setItem('os_jwt_required', 'yes');
      expect(getJwtRequirement()).toBe(JwtRequirement._Unknown);
    });

    test('round trips a stored value', () => {
      setJwtRequirement(JwtRequirement._Required);
      expect(getJwtRequirement()).toBe(JwtRequirement._Required);
    });

    test('getAppConfig persists required after a successful fetch', async () => {
      vi.spyOn(OneSignalApi, 'downloadServerAppConfig').mockResolvedValue(serverConfigWith(true));

      await getAppConfig(userConfig);

      expect(getJwtRequirement()).toBe(JwtRequirement._Required);
    });

    test('getAppConfig persists not required when the key is absent', async () => {
      setJwtRequirement(JwtRequirement._Required);
      vi.spyOn(OneSignalApi, 'downloadServerAppConfig').mockResolvedValue(
        serverConfigWith(undefined),
      );

      await getAppConfig(userConfig);

      expect(getJwtRequirement()).toBe(JwtRequirement._NotRequired);
    });

    test('a failed fetch keeps the cached value', async () => {
      setJwtRequirement(JwtRequirement._Required);
      vi.spyOn(OneSignalApi, 'downloadServerAppConfig').mockRejectedValue(new Error('timeout'));

      await expect(getAppConfig(userConfig)).rejects.toThrow('timeout');

      expect(getJwtRequirement()).toBe(JwtRequirement._Required);
    });

    test('a failed fetch with no cached value stays unknown', async () => {
      vi.spyOn(OneSignalApi, 'downloadServerAppConfig').mockRejectedValue(new Error('timeout'));

      await expect(getAppConfig(userConfig)).rejects.toThrow('timeout');

      expect(getJwtRequirement()).toBe(JwtRequirement._Unknown);
    });
  });
});
