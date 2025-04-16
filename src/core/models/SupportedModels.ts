import { SupportedSubscription } from './SubscriptionModels';
import { Identity } from './UserData';
import { UserPropertiesModel } from './UserPropertiesModel';

export enum ModelName {
  Identity = 'identity',
  Properties = 'properties',
  Subscriptions = 'subscriptions',
}

export enum LegacyModelName {
  PushSubscriptions = 'pushSubscriptions',
  EmailSubscriptions = 'emailSubscriptions',
  SmsSubscriptions = 'smsSubscriptions',
}

export type SupportedModel =
  | Identity
  | UserPropertiesModel
  | SupportedSubscription;
