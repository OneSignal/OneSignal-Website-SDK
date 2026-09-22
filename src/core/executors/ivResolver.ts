import Log from 'src/shared/libraries/Log';

import { IdentityConstants } from '../constants';
import { isIvBehaviorActive } from '../identityVerification';
import type { JwtTokenStore } from '../JwtTokenStore';
import type { Operation } from '../operations/Operation';
import type { AliasPair } from '../types/api';

/**
 * How a user-addressed request names the user and proves who it is.
 * Legacy: `onesignal_id` and no token. Under Identity Verification: `external_id`
 * and the stored token for that user.
 */
export type IvBackendParams = {
  alias: AliasPair;
  jwt?: string;
};

export function legacyBackendParams(onesignalId: string): IvBackendParams {
  return { alias: { label: IdentityConstants._OneSignalID, id: onesignalId } };
}

/*
 * Call sites gate on isIvCodePathEnabled. Inside, isIvBehaviorActive decides
 * between the IV values and the legacy values, so with the flag on and the
 * requirement off the request is identical to the legacy path.
 */

/** Alias switch plus token, for endpoints that address the user by alias. */
export function resolveBackendParams(
  op: Operation,
  onesignalId: string,
  jwtTokenStore: JwtTokenStore,
): IvBackendParams {
  if (!isIvBehaviorActive()) return legacyBackendParams(onesignalId);

  const externalId = op._externalId;
  if (!externalId) {
    // The enqueue and start-up purges should keep anonymous operations out of the
    // queue under IV. Address the user by onesignal_id so the request still goes out.
    Log._error(`IV active but ${op._name} has no externalId, so the request uses onesignal_id`);
    return legacyBackendParams(onesignalId);
  }

  return {
    alias: { label: IdentityConstants._ExternalID, id: externalId },
    jwt: jwtTokenStore._getJwt(externalId),
  };
}

/** Token only, no alias switch, for endpoints that address a subscription by id. */
export function resolveJwt(op: Operation, jwtTokenStore: JwtTokenStore): string | undefined {
  if (!isIvBehaviorActive()) return undefined;

  const externalId = op._externalId;
  return externalId ? jwtTokenStore._getJwt(externalId) : undefined;
}
