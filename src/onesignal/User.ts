import Environment from "../shared/helpers/Environment";
import { OSModel } from "../core/modelRepo/OSModel";
import { IdentityModel } from "../core/models/IdentityModel";
import { SupportedSubscription } from "../core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { UserPropertiesModel } from "../core/models/UserPropertiesModel";
import OneSignal from "./OneSignal";
import Log from "../shared/libraries/Log";

export default class User {
  awaitOneSignalIdAvailable: Promise<void> = new Promise<void>(() => {});

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

    // initialize user properties
    if (!userProperties) {
      this.createUserProperties();
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

    // copy the onesignal id promise to the user
    this.awaitOneSignalIdAvailable = this.identity.awaitOneSignalIdAvailable;

    // TO DO: populate subscription models also
  }

  private createUserProperties(): void {
    const properties = {
      language: Environment.getLanguage(),
      timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    this.userProperties = new OSModel<UserPropertiesModel>(ModelName.Properties, properties);
    // TO DO: fix user id
    this.userProperties.setOneSignalId("123");

    OneSignal.coreDirector.add(ModelName.Properties, this.userProperties as OSModel<SupportedModel>, false)
      .catch(e => {
        Log.error(e);
      });
  }
}
