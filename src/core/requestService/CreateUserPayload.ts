import { SupportedIdentity } from '../models/IdentityModel';
import { SupportedSubscription } from '../models/SubscriptionModels';
import { UserPropertiesModel } from '../models/UserPropertiesModel';

export type CreateUserPayload = {
  properties?: UserPropertiesModel;
  identity?: SupportedIdentity;
  refresh_device_metadata?: boolean;
  subscriptions?: SupportedSubscription[];
};
