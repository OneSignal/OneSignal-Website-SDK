import { SetRequired } from 'type-fest';

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

export interface ICreateUserSubscription {
  // app_version?: string; // For Mobile
  device_model?: string;
  device_os?: string;
  enabled: boolean;
  notification_types?: string[];
  // rooted?: boolean; // For Android
  sdk?: string;
  token: string;
  session_time?: number;
  session_count?: number;
  // test_type: number; // For iOS
  type: string;
  web_auth?: string;
  web_p256?: string;
}

export interface ICreateUser {
  refresh_device_metadata?: boolean;
  identity: ICreateUserIdentity;
  properties: IUserProperties;
  subscriptions: ICreateUserSubscription[];
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
