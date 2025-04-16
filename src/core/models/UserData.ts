import { SupportedSubscription } from './SubscriptionModels';
import { UserPropertiesModel } from './UserPropertiesModel';

export interface Identity {
  onesignal_id?: string;
  external_id?: string;
  [key: string]: unknown;
}

type UserData = {
  properties: UserPropertiesModel;
  identity: Identity;
  subscriptions?: SupportedSubscription[];
};

export default UserData;
