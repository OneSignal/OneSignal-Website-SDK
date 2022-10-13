import Environment from "../../src/shared/helpers/Environment";
import { OSModel } from "../../src/core/modelRepo/OSModel";
import { IdentityModel } from "../../src/core/models/IdentityModel";
import { SupportedSubscription } from "../../src/core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../../src/core/models/SupportedModels";
import { UserPropertiesModel } from "../../src/core/models/UserPropertiesModel";
import OneSignal from "./OneSignal";

export default class User {
  constructor(
    public identity?: OSModel<IdentityModel>,
    public userProperties?: OSModel<UserPropertiesModel>,
    // TO DO: explore option to consolidate into a single subscriptions property
    // Might have to make changes to avoid iteration to find correct model we want to modify
    public pushSubscriptions?: OSModel<SupportedSubscription>,
    public smsSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
    public emailSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
  ) {
    // initialize new user
    if (!identity) {
      this.createNewUser();
    }

    if (!userProperties) {
      this.userProperties = new OSModel<UserPropertiesModel>(ModelName.Properties, undefined, {
        language: Environment.getLanguage(),
        timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      OneSignal.coreDirector.add(ModelName.Properties, this.userProperties as OSModel<SupportedModel>);
    }
  }

  private createNewUser(): void {
    // TO DO: create user and get fresh onesignalId
    const data = {
      onesignalId: "123", // mock data
    };

    this.identity = new OSModel<IdentityModel>(ModelName.Identity, undefined, data);
    OneSignal.coreDirector.add(ModelName.Identity, this.identity as OSModel<SupportedModel>);

    // TO DO: populate subscription models also
  }
}
