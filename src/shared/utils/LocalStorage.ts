import { NotificationPermission } from '../models/NotificationPermission';
import PermissionManager from '../managers/PermissionManager';
import UserData from '../../core/models/UserData';

const IS_OPTED_OUT = "isOptedOut";
const IS_PUSH_NOTIFICATIONS_ENABLED = "isPushNotificationsEnabled";
const PAGE_VIEWS = "os_pageViews";
const REQUIRES_PRIVACY_CONSENT = "requiresPrivacyConsent";
const JWT_MAP = "jwtMap";

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
    return localStorage.getItem(REQUIRES_PRIVACY_CONSENT) === "true";
  }

  public static setStoredPermission(value: NotificationPermission): void {
    localStorage.setItem(PermissionManager.STORED_PERMISSION_KEY, value);
  }

  public static getStoredPermission(): NotificationPermission {
    const permission = localStorage.getItem(PermissionManager.STORED_PERMISSION_KEY) || "default";
    switch(permission) {
        case "granted":
            return NotificationPermission.Granted;
        case "denied":
            return NotificationPermission.Denied;
        default:
            return NotificationPermission.Default;
    }
  }

  public static setLocalPageViewCount(count: number): void {
    localStorage.setItem(PAGE_VIEWS, count.toString());
  }

  public static getLocalPageViewCount(): number {
    return Number(localStorage.getItem(PAGE_VIEWS));
  }

  public static setJWTForExternalId(externalId: string, jwt: string): void {
    const rawJwtMap = localStorage.getItem(JWT_MAP);
    const jwtMapObject = rawJwtMap ? JSON.parse(rawJwtMap) : {};
    jwtMapObject[externalId] = jwt;
    localStorage.setItem(JWT_MAP, JSON.stringify(jwtMapObject));
  }

  public static getJWTForExternalId(externalId?: string): string | undefined {
    if (!externalId) {
      return undefined;
    }

    const rawJwtMap = localStorage.getItem(JWT_MAP);
    const jwtMapObject = rawJwtMap ? JSON.parse(rawJwtMap) : {};
    return jwtMapObject[externalId];
  }

  public static setLastValidUser(data: UserData): void {
    localStorage.setItem("lastValidUser", JSON.stringify(data));
  }

  static getLastValidUser(): UserData | null {
    const json = localStorage.getItem("lastValidUser")
    if (!json) {
      return null;
    }
    return JSON.parse(json) as UserData;
  }
}
