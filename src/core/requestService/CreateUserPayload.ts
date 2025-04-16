import { SupportedSubscription } from '../models/SubscriptionModels';
import { Identity } from '../models/UserData';
import { UserPropertiesModel } from '../models/UserPropertiesModel';

export type CreateUserPayload = {
  properties?: UserPropertiesModel;
  identity?: Identity;
  refresh_device_metadata?: boolean;
  subscriptions?: SupportedSubscription[];
};
