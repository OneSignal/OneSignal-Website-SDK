import {Notification} from "./Notification";
import {Timestamp} from "./Timestamp";
class AppState {
    defaultNotificationUrl: string;
    defaultNotificationTitle: string;

    /**
     * Whether the user is currently completely subscribed, including not opted out. Database cached version of
     * isPushNotificationsEnabled().
     */
    lastKnownPushEnabled: boolean;

    clickedNotifications: Map<URL, [Notification, Timestamp]>
}

export { AppState };