import { SupportedIdentity } from './IdentityModel';
import { SupportedSubscription } from './SubscriptionModels';
import { UserPropertiesModel } from './UserPropertiesModel';

export enum ModelName {
  Identity = 'identity',
  Properties = 'properties',
  // TO DO: make singular
  PushSubscriptions = 'pushSubscriptions',
  EmailSubscriptions = 'emailSubscriptions',
  SmsSubscriptions = 'smsSubscriptions',
}

export type SupportedModel =
  | SupportedIdentity
  | UserPropertiesModel
  | SupportedSubscription;
