export enum SubscriptionStateKind {
  // Notification permission is not granted at the browser level.
  // Used if the native notification permission is 'default' or 'declined'
  NoNativePermission = 0,
  // Everything is available for the subscription to be enabled;
  // not opted out, has token, and notification permission is granted.
  Subscribed = 1,
  // OneSignal.User.PushSubscription.optOut() called or end-user opted out from SDK bell widget
  // UserOptedOut takes priority over NoNativePermission
  UserOptedOut = -2,
  NotSubscribed = -10,
  TemporaryWebRecord = -20,
  PermissionRevoked = -21,
  PushSubscriptionRevoked = -22,
  ServiceWorkerStatus403 = -23,
  ServiceWorkerStatus404 = -24
}
