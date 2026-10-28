const FEATURE_FLAGS = 'os_feature_flags';
const FEATURE_OVERRIDES = 'os_feature_overrides';
const IS_OPTED_OUT = 'isOptedOut';
const IS_PUSH_NOTIFICATIONS_ENABLED = 'isPushNotificationsEnabled';
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

export function getFeatureFlags(): unknown[] {
  return parseList(localStorage.getItem(FEATURE_FLAGS));
}

export function setFeatureFlags(flags: unknown[]): void {
  localStorage.setItem(FEATURE_FLAGS, JSON.stringify(flags));
}

// Only the SDK writes these lists, so anything that isn't an array reads as empty.
export function parseList(json: string | null | undefined): unknown[] {
  try {
    const list: unknown = JSON.parse(json || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Comma-separated flag keys forced on for local testing.
export function getFeatureOverrides(): string[] {
  return (localStorage.getItem(FEATURE_OVERRIDES) ?? '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
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
