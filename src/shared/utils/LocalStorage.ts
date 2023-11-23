import { NotificationPermission } from '../models/NotificationPermission';
import PermissionManager from '../managers/PermissionManager';

const IS_OPTED_OUT = 'isOptedOut';
const IS_PUSH_NOTIFICATIONS_ENABLED = 'isPushNotificationsEnabled';
const PAGE_VIEWS = 'os_pageViews';
const REQUIRES_PRIVACY_CONSENT = 'requiresPrivacyConsent';

export default class LocalStorage {
  /**
   * Used in OneSignal initialization to dedupe local storage subscription options already being saved to IndexedDB.
   * We will eventually be able to remove this function.
   */
  static removeLegacySubscriptionOptions(): void {
    localStorage.removeItem(IS_OPTED_OUT);
    localStorage.removeItem(IS_PUSH_NOTIFICATIONS_ENABLED);
  }

  static setConsentRequired(value: boolean): void {
    localStorage.setItem(REQUIRES_PRIVACY_CONSENT, value.toString());
  }

  static getConsentRequired(): boolean {
    return localStorage.getItem(REQUIRES_PRIVACY_CONSENT) === 'true';
  }

  public static setLocalPageViewCount(count: number): void {
    localStorage.setItem(PAGE_VIEWS, count.toString());
  }

  public static getLocalPageViewCount(): number {
    return Number(localStorage.getItem(PAGE_VIEWS));
  }
}
