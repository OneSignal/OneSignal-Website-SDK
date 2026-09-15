import {
  isJwtRequirementValue,
  JwtRequirement,
  type JwtRequirementValue,
} from '../config/jwtRequirement';

const IS_OPTED_OUT = 'isOptedOut';
const IS_PUSH_NOTIFICATIONS_ENABLED = 'isPushNotificationsEnabled';
const JWT_REQUIRED = 'os_jwt_required';
const PAGE_VIEWS = 'os_pageViews';
const REQUIRES_PRIVACY_CONSENT = 'requiresPrivacyConsent';
const USER_CONSENT = 'userConsent';

/**
 * Used in OneSignal initialization to dedupe local storage subscription options already being saved to IndexedDB.
 * We will eventually be able to remove this function.
 */
export function removeLegacySubscriptionOptions(): void {
  localStorage.removeItem(IS_OPTED_OUT);
  localStorage.removeItem(IS_PUSH_NOTIFICATIONS_ENABLED);
}

export function setConsentRequired(value: boolean): void {
  localStorage.setItem(REQUIRES_PRIVACY_CONSENT, value.toString());
}

export function getConsentRequired(): boolean {
  const requiresUserPrivacyConsent =
    OneSignal.config?.userConfig.requiresUserPrivacyConsent ?? false;
  return localStorage.getItem(REQUIRES_PRIVACY_CONSENT) === 'true' || requiresUserPrivacyConsent;
}

// Persisted in localStorage rather than IndexedDB: it's a privacy/legal opt-out
// that isn't re-derivable from any other source, and on a wedged iOS Safari PWA
// an IndexedDB write can be silently dropped, losing a revocation across reloads.
export function setConsentGiven(value: boolean): void {
  localStorage.setItem(USER_CONSENT, value.toString());
}

// Returns null when no value has been stored, so callers can fall back to the
// legacy IndexedDB row for one-time migration.
export function getConsentGiven(): boolean | null {
  const value = localStorage.getItem(USER_CONSENT);
  return value === null ? null : value === 'true';
}

// Written only after a successful config fetch, so a failed fetch keeps the
// last known value and a first load with no value reads as unknown.
export function setJwtRequirement(value: JwtRequirementValue): void {
  localStorage.setItem(JWT_REQUIRED, value);
}

export function getJwtRequirement(): JwtRequirementValue {
  const value = localStorage.getItem(JWT_REQUIRED);
  return isJwtRequirementValue(value) ? value : JwtRequirement._Unknown;
}

export function setLocalPageViewCount(count: number): void {
  localStorage.setItem(PAGE_VIEWS, count.toString());
}

/**
 * Returns Page Views saved to Local Storage (Persists Longer than Single Session)
 */
export function getLocalPageViewCount(): number {
  return Number(localStorage.getItem(PAGE_VIEWS));
}
