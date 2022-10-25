import Environment from "../shared/helpers/Environment";
import { OSModel } from "../core/modelRepo/OSModel";
import { IdentityModel } from "../core/models/IdentityModel";
import { SupportedSubscription } from "../core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { UserPropertiesModel } from "../core/models/UserPropertiesModel";
import OneSignal from "./OneSignal";
import Log from "../shared/libraries/Log";

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
      const properties = {
        language: Environment.getLanguage(),
        timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      // TO DO: fix user id
      this.userProperties = new OSModel<UserPropertiesModel>(ModelName.Properties, properties, undefined, "123");
      OneSignal.coreDirector.add(ModelName.Properties, this.userProperties as OSModel<SupportedModel>, false)
        .catch(e => {
          Log.error(e);
        });
    }
  }

  private createNewUser(): void {
    // TO DO: create user and get fresh onesignalId
    const data = {
      onesignalId: "123", // mock data
    };

    this.identity = new OSModel<IdentityModel>(ModelName.Identity, data, undefined);
    this.identity.setOneSignalId(data.onesignalId);
    OneSignal.coreDirector.add(ModelName.Identity, this.identity as OSModel<SupportedModel>, false).catch(e => {
      Log.error(e);
    });

    // TO DO: populate subscription models also
  }
}
