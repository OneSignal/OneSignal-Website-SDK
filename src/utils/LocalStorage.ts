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
}
