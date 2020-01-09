import { NotificationPermission } from '../models/NotificationPermission';

const IS_OPTED_OUT = "isOptedOut";
const IS_PUSH_NOTIFICATIONS_ENABLED = "isPushNotificationsEnabled";

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

    public static setStoredPermission(key: string, value: string): void {
        localStorage.setItem(key, value);
    }

    public static getStoredPermission(key: string): NotificationPermission {
        var permission = localStorage.getItem(key) || "default";
        switch(permission){
            case "granted":
                return NotificationPermission.Granted;
            case "denied":
                return NotificationPermission.Denied;
            default:
                return NotificationPermission.Default;
        }
    }
}
