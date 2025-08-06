import type { NotificationClickEventInternal } from '../notifications/types';

// NotificationsClickEvents that are waiting to fire until these conditions are meet:
// 1. Page is opened to the result.url; that is once a page is open to the intended URL
// 2. There is a listener added via OneSignal.Notifications.addEventListener('clicked', (event) => ...)
export interface PendingNotificationClickEvents {
  [key: string]: NotificationClickEventInternal; // key = result.url
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
  lastKnownOptedIn = true;

  pendingNotificationClickEvents: PendingNotificationClickEvents | undefined;
}

export { AppState };
