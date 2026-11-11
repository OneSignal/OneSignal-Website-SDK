import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { JwtRequirement, type JwtRequirementValue } from 'src/shared/config/jwtRequirement';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import { beforeEach, describe, expect, test } from 'vite-plus/test';

import {
  isIvBehaviorActive,
  isIvCodePathEnabled,
  isJwtRequirementUnknown,
} from './identityVerification';

const setGates = (flagOn: boolean, requirement: JwtRequirementValue) => {
  setFeatureFlags(flagOn ? [FeatureFlag._IdentityVerification] : []);
  setJwtRequirement(requirement);
};

const readGates = () => [isIvCodePathEnabled(), isIvBehaviorActive()];

describe('identityVerification gates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('gate derivation', () => {
    test('flag off + UNKNOWN: both gates false', () => {
      setGates(false, JwtRequirement._Unknown);
      expect(readGates()).toEqual([false, false]);
    });

    test('flag off + NOT_REQUIRED: both gates false', () => {
      setGates(false, JwtRequirement._NotRequired);
      expect(readGates()).toEqual([false, false]);
    });

    test('flag off + REQUIRED: both gates true (customer config wins)', () => {
      setGates(false, JwtRequirement._Required);
      expect(readGates()).toEqual([true, true]);
    });

    test('flag on + UNKNOWN: code path enabled, behavior inactive', () => {
      setGates(true, JwtRequirement._Unknown);
      expect(readGates()).toEqual([true, false]);
    });

    test('flag on + NOT_REQUIRED: code path enabled, behavior inactive (Phase 3)', () => {
      setGates(true, JwtRequirement._NotRequired);
      expect(readGates()).toEqual([true, false]);
    });

    test('flag on + REQUIRED: both gates true (full IV)', () => {
      setGates(true, JwtRequirement._Required);
      expect(readGates()).toEqual([true, true]);
    });

    test('gates are derived on read, so a source change shows without an update call', () => {
      setGates(false, JwtRequirement._Unknown);
      expect(readGates()).toEqual([false, false]);

      setFeatureFlags([FeatureFlag._IdentityVerification]);
      expect(readGates()).toEqual([true, false]);

      setJwtRequirement(JwtRequirement._Required);
      expect(readGates()).toEqual([true, true]);
    });

    test('the local override turns the code path on', () => {
      setGates(false, JwtRequirement._NotRequired);
      localStorage.setItem('os_feature_overrides', FeatureFlag._IdentityVerification);

      expect(readGates()).toEqual([true, false]);
    });
  });

  describe('isJwtRequirementUnknown', () => {
    test('true only before the first successful config fetch', () => {
      expect(isJwtRequirementUnknown()).toBe(true);

      setJwtRequirement(JwtRequirement._NotRequired);
      expect(isJwtRequirementUnknown()).toBe(false);

      setJwtRequirement(JwtRequirement._Required);
      expect(isJwtRequirementUnknown()).toBe(false);
    });
  });

  describe('test environment', () => {
    test('persists the requirement from the fake server config', () => {
      TestEnvironment.initialize();
      expect(isIvBehaviorActive()).toBe(false);

      TestEnvironment.initialize({ overrideServerConfig: { config: { jwt_required: true } } });
      expect(isIvBehaviorActive()).toBe(true);
    });
  });
});
