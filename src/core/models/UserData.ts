import { IdentityModel } from "./IdentityModel";
import { SupportedSubscription } from "./SubscriptionModels";
import { UserPropertiesModel } from "./UserPropertiesModel";

type UserData = {
  properties: UserPropertiesModel,
  identity: IdentityModel,
  subscriptions: SupportedSubscription[]
};

export default UserData;
