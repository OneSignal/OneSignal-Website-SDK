import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import { FeatureFlag, isFeatureEnabled } from 'src/shared/features/featureFlags';
import { getJwtRequirement } from 'src/shared/helpers/localStorage';

/*
 * Identity Verification gates. Both are derived on read from the persisted
 * requirement and the feature flag, so a change in either source shows up on
 * the next read. UNKNOWN reads as false.
 *
 * Call sites gate on isIvCodePathEnabled; the IV helpers gate on
 * isIvBehaviorActive inside. With the flag on and the requirement off, the
 * new code runs but must produce requests identical to the legacy path.
 */

/** IV behavior applies: bearer, alias switch, unauthorized handling. */
export function isIvBehaviorActive(): boolean {
  return getJwtRequirement() === JwtRequirement._Required;
}

/** The new IV code paths run at all: `flag || isIvBehaviorActive()`. */
export function isIvCodePathEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag._IdentityVerification) || isIvBehaviorActive();
}
