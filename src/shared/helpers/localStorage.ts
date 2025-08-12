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

// timed storage
export function isLocalStorageSupported(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    localStorage.getItem('test');
    return true;
  } catch (e) {
    return false;
  }
}

export function setTempItem(
  key: string,
  value: any,
  expirationInMinutes?: number,
): void {
  if (!isLocalStorageSupported()) {
    return;
  }
  const expirationInMilliseconds =
    typeof expirationInMinutes !== 'undefined'
      ? expirationInMinutes * 60 * 1000
      : 0;
  const record = {
    value: JSON.stringify(value),
    timestamp:
      typeof expirationInMinutes !== 'undefined'
        ? new Date().getTime() + expirationInMilliseconds
        : undefined,
  };
  localStorage.setItem(key, JSON.stringify(record));
}

export function getTempItem(key: string): any | null {
  if (!isLocalStorageSupported()) {
    return null;
  }
  const record = localStorage.getItem(key);
  let parsedRecord;
  try {
    // @ts-expect-error - we have this in a try catch
    parsedRecord = JSON.parse(record);
  } catch (e) {
    return null;
  }
  if (parsedRecord === null) {
    return null;
  }

  if (
    parsedRecord.timestamp &&
    new Date().getTime() >= parsedRecord.timestamp
  ) {
    localStorage.removeItem(key);
    return null;
  }

  let parsedRecordValue = parsedRecord.value;
  try {
    parsedRecordValue = JSON.parse(parsedRecord.value);
  } catch (e) {
    return parsedRecordValue;
  }
  return parsedRecordValue;
}
