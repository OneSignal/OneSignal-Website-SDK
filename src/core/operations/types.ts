import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { SubscriptionType } from '../models/SubscriptionModels';

export interface Subscription {
  appId: string;
  enabled: boolean;
  notification_types: SubscriptionStateKind;
  onesignalId: string;
  subscriptionId: string;
  type: SubscriptionType;
  sdk?: string;
  device_model?: string;
  device_os?: number;
  web_auth?: string;
  web_p256?: string;
}
