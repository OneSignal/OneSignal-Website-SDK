export const SubscriptionChannel = {
  _Email: 'Email',
  _SMS: 'SMS',
  _Push: 'Push',
} as const;

export const SubscriptionType = {
  _ChromePush: 'ChromePush',
  _Email: 'Email',
  _SMS: 'SMS',
  _SafariPush: 'SafariPush',
  _SafariLegacyPush: 'SafariLegacyPush',
  _FirefoxPush: 'FirefoxPush',
  // And others but not relevant for Web SDK
  // macOSPush: 'macOSPush',
  // AndroidPush: 'AndroidPush',
  // FireOSPush: 'FireOSPush',
  // HuaweiPush: 'HuaweiPush',
  // iOSPush: 'iOSPush',
  // WindowsPush: 'WindowsPush',
} as const;

export const NotificationType = {
  // Notification permission is not granted at the browser level.
  // Used if the native notification permission is 'default' or 'declined'
  _NoNativePermission: 0,
  // Everything is available for the subscription to be enabled;
  // not opted out, has token, and notification permission is granted.
  _Subscribed: 1,
  // OneSignal.User.PushSubscription.optOut() called or end-user opted out from SDK bell widget
  // UserOptedOut takes priority over NoNativePermission
  _UserOptedOut: -2,
  _NotSubscribed: -10,
  _TemporaryWebRecord: -20,
  _PermissionRevoked: -21,
  _PushSubscriptionRevoked: -22,
  _ServiceWorkerStatus403: -23,
  _ServiceWorkerStatus404: -24,
} as const;
