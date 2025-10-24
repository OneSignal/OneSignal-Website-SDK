const PAGE_VIEWS = 'os_pageViews';
const REQUIRES_PRIVACY_CONSENT = 'requiresPrivacyConsent';

export function setConsentRequired(value: boolean): void {
  localStorage.setItem(REQUIRES_PRIVACY_CONSENT, value.toString());
}

export function getConsentRequired(): boolean {
  const requiresUserPrivacyConsent =
    OneSignal.config?.userConfig.requiresUserPrivacyConsent ?? false;
  return (
    localStorage.getItem(REQUIRES_PRIVACY_CONSENT) === 'true' ||
    requiresUserPrivacyConsent
  );
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
