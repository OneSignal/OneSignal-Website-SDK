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

/** The ids that name a user. An operation carries them, and so does the identity model. */
export type UserIds = {
  onesignalId: string;
  externalId?: string;
};

function legacyBackendParams(onesignalId: string): IvBackendParams {
  return { alias: { label: IdentityConstants._OneSignalID, id: onesignalId } };
}

/*
 * All resolvers gate on isIvBehaviorActive themselves. isIvBehaviorActive
 * implies isIvCodePathEnabled, so a call site needs no outer gate: with the
 * flag on and the requirement off the result is identical to the legacy path.
 */

/**
 * Alias switch plus token for a user named by ids. `source` names the caller in
 * the log line when IV is active and the user is anonymous.
 */
export function resolveUserBackendParams(
  { onesignalId, externalId }: UserIds,
  source: string,
  jwtTokenStore: JwtTokenStore,
): IvBackendParams {
  if (!isIvBehaviorActive()) return legacyBackendParams(onesignalId);

  if (!externalId) {
    // The enqueue and start-up purges should keep anonymous operations out of the
    // queue under IV. Address the user by onesignal_id so the request still goes out.
    Log._error(`IV active but ${source} has no externalId, so the request uses onesignal_id`);
    return legacyBackendParams(onesignalId);
  }

  return {
    alias: { label: IdentityConstants._ExternalID, id: externalId },
    jwt: jwtTokenStore._getJwt(externalId),
  };
}

/** Alias switch plus token, for endpoints that address the user by alias. */
export function resolveBackendParams(op: Operation, jwtTokenStore: JwtTokenStore): IvBackendParams {
  return resolveUserBackendParams(
    { onesignalId: op._onesignalId, externalId: op._externalId },
    op._name,
    jwtTokenStore,
  );
}

/** Token only, no alias switch, for endpoints that address a subscription by id. */
export function resolveJwt(op: Operation, jwtTokenStore: JwtTokenStore): string | undefined {
  if (!isIvBehaviorActive()) return undefined;

  const externalId = op._externalId;
  return externalId ? jwtTokenStore._getJwt(externalId) : undefined;
}
