import { Notification } from "./Notification";
import { Timestamp } from "./Timestamp";

export interface ClickedNotifications {
    [key: string]: [Notification, Timestamp]
}

class AppState {
    defaultNotificationUrl: string | undefined;
    defaultNotificationTitle: string | undefined;

    /**
     * Whether the user is currently completely subscribed, including not opted out. Database cached version of
     * isPushNotificationsEnabled().
     */
    lastKnownPushEnabled: boolean | undefined;

    clickedNotifications: ClickedNotifications | undefined;
}

export { AppState };