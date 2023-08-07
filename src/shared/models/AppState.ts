import { NotificationClickEventInternal } from "./NotificationEvent";

// NotificationsClickEvents that are waiting to fire until their conditions are meet;
// that is once a page is open to the intended URL and there is a listener setup via
// OneSignal.Notifications.addEventListener('clicked', (event) => ...)
export interface NotificationClickEventsPendingUrlOpening {
  [key: string]: NotificationClickEventInternal; // key = event.result.url
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

    notificationClickEventsPendingUrlOpening: NotificationClickEventsPendingUrlOpening | undefined;
}

export { AppState };