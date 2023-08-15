import { SupportedIdentity } from "./IdentityModel";
import { SupportedSubscription } from "./SubscriptionModels";
import { UserPropertiesModel } from "./UserPropertiesModel";

type UserData = {
  properties: UserPropertiesModel,
  identity: SupportedIdentity,
  subscriptions: SupportedSubscription[]
};

export default UserData;
