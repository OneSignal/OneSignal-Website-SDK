const IS_OPTED_OUT = 'isOptedOut';
const IS_PUSH_NOTIFICATIONS_ENABLED = 'isPushNotificationsEnabled';
const PAGE_VIEWS = 'os_pageViews';
const REQUIRES_PRIVACY_CONSENT = 'requiresPrivacyConsent';

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
  return localStorage.getItem(REQUIRES_PRIVACY_CONSENT) === 'true';
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
