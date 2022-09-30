import { NotificationPermission } from '../models/NotificationPermission';
import PermissionManager from '../managers/PermissionManager';

const IS_OPTED_OUT = "isOptedOut";
const IS_PUSH_NOTIFICATIONS_ENABLED = "isPushNotificationsEnabled";
const PAGE_VIEWS = "os_pageViews";

export default class LocalStorage {
    public static getIsOptedOut(): boolean {
        return localStorage.getItem(IS_OPTED_OUT) === "true";
    }

    public static getIsPushNotificationsEnabled(): boolean {
        return localStorage.getItem(IS_PUSH_NOTIFICATIONS_ENABLED) === "true";
    }

    public static setIsOptedOut(value: boolean): void {
        localStorage.setItem(IS_OPTED_OUT, value.toString());
    }

    public static setIsPushNotificationsEnabled(value: boolean): void {
        localStorage.setItem(IS_PUSH_NOTIFICATIONS_ENABLED, value.toString());
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
}
