import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID } from '__test__/constants';
import { JwtRequirement, type JwtRequirementValue } from 'src/shared/config/jwtRequirement';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { IdentityConstants } from '../constants';
import { JwtTokenStore } from '../JwtTokenStore';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { legacyBackendParams, resolveBackendParams, resolveJwt } from './ivResolver';

const JWT = 'header.payload.signature';
const legacy = { alias: { label: IdentityConstants._OneSignalID, id: ONESIGNAL_ID } };
const identified = { alias: { label: IdentityConstants._ExternalID, id: EXTERNAL_ID } };

const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => '');

const setGates = (flagOn: boolean, requirement: JwtRequirementValue) => {
  setFeatureFlags(flagOn ? [FeatureFlag._IdentityVerification] : []);
  setJwtRequirement(requirement);
};

const ownedOp = () => new RefreshUserOperation(APP_ID, ONESIGNAL_ID, EXTERNAL_ID);
const anonymousOp = () => new RefreshUserOperation(APP_ID, ONESIGNAL_ID);

let tokens: JwtTokenStore;

describe('ivResolver', () => {
  beforeEach(() => {
    localStorage.clear();
    tokens = new JwtTokenStore();
  });

  test('legacyBackendParams addresses the user by onesignal_id with no token', () => {
    expect(legacyBackendParams(ONESIGNAL_ID)).toEqual(legacy);
  });

  describe('resolveBackendParams', () => {
    test('IV inactive: legacy values, even for an owned operation with a stored token', () => {
      setGates(false, JwtRequirement._NotRequired);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveBackendParams(ownedOp(), ONESIGNAL_ID, tokens)).toEqual(legacy);
    });

    test('Phase 3 (flag on, requirement off): values identical to legacy', () => {
      setGates(true, JwtRequirement._NotRequired);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveBackendParams(ownedOp(), ONESIGNAL_ID, tokens)).toEqual(legacy);
    });

    test('IV active: external_id alias plus the stored token', () => {
      setGates(true, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveBackendParams(ownedOp(), ONESIGNAL_ID, tokens)).toEqual({
        ...identified,
        jwt: JWT,
      });
    });

    test('IV active without a stored token: external_id alias and no token', () => {
      setGates(true, JwtRequirement._Required);

      expect(resolveBackendParams(ownedOp(), ONESIGNAL_ID, tokens)).toEqual(identified);
    });

    test('IV active with an anonymous operation: legacy values and an error log', () => {
      setGates(true, JwtRequirement._Required);

      expect(resolveBackendParams(anonymousOp(), ONESIGNAL_ID, tokens)).toEqual(legacy);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('refresh-user has no externalId'),
      );
    });

    test('the requirement alone turns IV on (customer config wins over the flag)', () => {
      setGates(false, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveBackendParams(ownedOp(), ONESIGNAL_ID, tokens)).toEqual({
        ...identified,
        jwt: JWT,
      });
    });
  });

  describe('resolveJwt', () => {
    test('IV inactive: no token, even when one is stored', () => {
      setGates(true, JwtRequirement._NotRequired);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveJwt(ownedOp(), tokens)).toBeUndefined();
    });

    test('IV active: the stored token for the owner', () => {
      setGates(true, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveJwt(ownedOp(), tokens)).toBe(JWT);
    });

    test('IV active without a stored token: undefined', () => {
      setGates(true, JwtRequirement._Required);

      expect(resolveJwt(ownedOp(), tokens)).toBeUndefined();
    });

    test('IV active with an anonymous operation: undefined and no log', () => {
      setGates(true, JwtRequirement._Required);
      tokens._putJwt(EXTERNAL_ID, JWT);

      expect(resolveJwt(anonymousOp(), tokens)).toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
