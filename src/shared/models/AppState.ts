export interface ClickedNotifications {
    [key: string]: { url: string; data: any; timestamp: number; };
}

class AppState {
    defaultNotificationUrl: string | undefined;
    defaultNotificationTitle: string | undefined;

    /**
     * Whether the user is currently completely subscribed, including not opted out. Database cached version of
     * isPushNotificationsEnabled().
     */
    lastKnownPushEnabled: boolean | undefined;

    lastKnownPushToken: string | undefined;

    lastKnownPushId: string | undefined;

    // default true
    lastKnownOptedIn: boolean = true;

    clickedNotifications: ClickedNotifications | undefined;
}

export { AppState };