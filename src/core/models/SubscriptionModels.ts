import { SubscriptionStateKind } from '../../shared/models/SubscriptionStateKind';

export type SupportedSubscription = SubscriptionModel | FutureSubscriptionModel;

export enum SubscriptionType {
  ChromePush = 'ChromePush',
  SafariPush = 'SafariPush',
  SafariLegacyPush = 'SafariLegacyPush',
  FirefoxPush = 'FirefoxPush',
  Email = 'Email',
  SMS = 'SMS',
  // There are other OneSignal types, but only including ones used here.
}

export interface FutureSubscriptionModel {
  type: SubscriptionType;
  token?: string; // maps to legacy player.identifier
  enabled?: boolean;
  notification_types?: SubscriptionStateKind;
  sdk?: string;
  device_model?: string;
  device_os?: number;
  web_auth?: string;
  web_p256?: string;
}

export interface SubscriptionModel extends FutureSubscriptionModel {
  id: string;
}
