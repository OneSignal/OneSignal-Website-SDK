import { SetRequired } from 'type-fest';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Create User
// Reference: https://documentation.onesignal.com/reference/create-user#body-parameters
export interface IUserProperties {
  country?: string;
  first_active?: number;
  ip?: string;
  last_active?: number;
  lat?: number;
  long?: number;
  language?: string;
  tags?: { [key: string]: string };
  timezone_id?: string;
}

export interface ICreateUserIdentity {
  external_id?: string;
  [key: string]: string | undefined;
}

export const SubscriptionType = {
  ChromePush: 'ChromePush',
  Email: 'Email',
  SMS: 'SMS',
  SafariPush: 'SafariPush',
  SafariLegacyPush: 'SafariLegacyPush',
  FirefoxPush: 'FirefoxPush',
  // And others but not relevant for Web SDK
  // macOSPush: 'macOSPush',
  // AndroidPush: 'AndroidPush',
  // FireOSPush: 'FireOSPush',
  // HuaweiPush: 'HuaweiPush',
  // iOSPush: 'iOSPush',
  // WindowsPush: 'WindowsPush',
} as const;

export type SubscriptionTypeValue =
  (typeof SubscriptionType)[keyof typeof SubscriptionType];

export const NotificationType = {
  // Notification permission is not granted at the browser level.
  // Used if the native notification permission is 'default' or 'declined'
  NoNativePermission: 0,
  // Everything is available for the subscription to be enabled;
  // not opted out, has token, and notification permission is granted.
  Subscribed: 1,
  // OneSignal.User.PushSubscription.optOut() called or end-user opted out from SDK bell widget
  // UserOptedOut takes priority over NoNativePermission
  UserOptedOut: -2,
  NotSubscribed: -10,
  TemporaryWebRecord: -20,
  PermissionRevoked: -21,
  PushSubscriptionRevoked: -22,
  ServiceWorkerStatus403: -23,
  ServiceWorkerStatus404: -24,
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export interface ICreateUserSubscription {
  // app_version?: string; // For Mobile
  device_model?: string;
  device_os?: string;
  enabled?: boolean;
  notification_types?: NotificationTypeValue;
  // rooted?: boolean; // For Android
  sdk?: string;
  token: string;
  session_time?: number;
  session_count?: number;
  // test_type: number; // For iOS
  type: SubscriptionTypeValue;
  web_auth?: string;
  web_p256?: string;
}

export interface ICreateUser {
  refresh_device_metadata?: boolean;
  identity: ICreateUserIdentity;
  properties?: IUserProperties;
  subscriptions?: ICreateUserSubscription[];
}

export interface IUserIdentity {
  onesignal_id: string;
  external_id?: string;
  [key: string]: string | undefined;
}

export type ISubscription = {
  app_id: string;
  id: string;
} & SetRequired<ICreateUserSubscription, keyof ICreateUserSubscription>;

export interface UserData {
  identity: IUserIdentity;
  properties?: IUserProperties;
  subscriptions?: ISubscription[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Update User
// Reference: https://documentation.onesignal.com/reference/update-user
export interface IUpdateUserDeltas {
  session_time?: number;
  session_count?: number;
  // also purchases but not relevant for web sdk
}

export interface IUpdateUser {
  properties?: IUserProperties;
  refresh_device_metadata?: boolean;
  deltas?: IUpdateUserDeltas;
}
