export default class LocalStorage {
    public static getIsOptedOut() {
        return localStorage.getItem('isOptedOut');
    }

    public static getIsPushNotificationsEnabled() {
        return localStorage.getItem('isPushNotificationsEnabled');
    }
}