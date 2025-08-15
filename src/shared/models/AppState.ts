class AppState {
  defaultNotificationUrl: string | null | undefined;
  defaultNotificationTitle: string | null | undefined;

  /**
   * Whether the user is currently completely subscribed, including not opted out. Database cached version of
   * isPushNotificationsEnabled().
   */
  lastKnownPushEnabled: boolean | null | undefined;

  lastKnownPushToken: string | null | undefined;

  lastKnownPushId: string | null | undefined;

  // default true
  lastKnownOptedIn: boolean | null = true;
}

export { AppState };
