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

    // if not loaded from cache, initialize new user
    if (!identity) {
      identity = this.createNewUser();
    }

    // copy the onesignal id promise to the user
    this.awaitOneSignalIdAvailable = identity.awaitOneSignalIdAvailable;

    // initialize user properties
    if (!userProperties) {
      this.createUserProperties();
    }
  }

  private createNewUser(): OSModel<IdentityModel> {
    // TO DO: create user and get fresh onesignalId
    const data = {
      onesignalId: "123", // mock data
    };

    this.identity = new OSModel<IdentityModel>(ModelName.Identity, data, undefined);

    // set the onesignal id on the OSModel class-level property
    this.identity.setOneSignalId(data.onesignalId);

    /**
     * Set the onesignal id on the OSModel `data` property
     * To keep the `OSModel` class model-agnostic, we do not want to add any Identity Model-specific code in the
     * `setOneSignalId` function.Therefore, we must manually set the onesignal id on the `data` property as well
     */
    // TO DO: cover with unit test
    this.identity.data["onesignalId"] = data.onesignalId;

    OneSignal.coreDirector.add(ModelName.Identity, this.identity as OSModel<SupportedModel>, false).catch(e => {
      Log.error(e);
    });

    // TO DO: populate subscription models also
    return this.identity;
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
