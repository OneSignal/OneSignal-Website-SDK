import Environment from "../shared/helpers/Environment";
import { OSModel } from "../core/modelRepo/OSModel";
import { IdentityModel } from "../core/models/IdentityModel";
import { SupportedSubscription } from "../core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { UserPropertiesModel } from "../core/models/UserPropertiesModel";
import OneSignal from "./OneSignal";
import Log from "../shared/libraries/Log";

export default class User {
  identified: boolean = false;
  awaitOneSignalIdAvailable?: Promise<void> = new Promise<void>(() => {});

  static singletonInstance?: User = undefined;

  private constructor(
    public identity?: OSModel<IdentityModel>,
    public userProperties?: OSModel<UserPropertiesModel>,
    // TO DO: explore option to consolidate into a single subscriptions property
    // Might have to make changes to avoid iteration to find correct model we want to modify
    public pushSubscriptions?: OSModel<SupportedSubscription>,
    public smsSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
    public emailSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
  ) {

    // copy the onesignal id promise to the user
    this.awaitOneSignalIdAvailable = identity?.awaitOneSignalIdAvailable;

    this.awaitOneSignalIdAvailable?.then(() => {
      this.identified = true;
    });
  }

  /**
   * Creates a user singleton
   * @param identity - identity model
   * @param userProperties - user properties model
   * @param pushSubscriptions - push subscription model
   * @param smsSubscriptions - sms subscription models
   * @param emailSubscriptions - email subscription models
   * @returns - User singleton
   */
  static createOrGetInstance(
    identity?: OSModel<IdentityModel>,
    userProperties?: OSModel<UserPropertiesModel>,
    pushSubscriptions?: OSModel<SupportedSubscription>,
    smsSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
    emailSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
  ): User {
    if (!User.singletonInstance) {
      User.singletonInstance = new User(
        identity,
        userProperties,
        pushSubscriptions,
        smsSubscriptions,
        emailSubscriptions,
      );
    }

    return User.singletonInstance;
  }

  /**
   * Flushes model references in order to prepare for a new user
   * Use case: when logging in, we want to flush the current user and create a new one
   * This allows us to continue processing operations (e.g: addTag) while the new user is being created
   * and we are waiting for the new (or same) onesignalId to be available depending on whether the alias
   * already exists or not
   */
  public flushModelReferences(): void {
    this.identity = undefined;
    this.userProperties = undefined;
    this.pushSubscriptions = undefined;
    this.smsSubscriptions = undefined;
    this.emailSubscriptions = undefined;
  }

  /**
   * Sets up a new user
   * @param isTemporaryLocal - used when creating a local-only temporary user while logging in
   */
  public async setupNewUser(isTemporaryLocal?: boolean): Promise<void> {
    // if not loaded from cache, initialize new user
    if (!this.identity) {
      this.identity = await this._createAnonymousUser(isTemporaryLocal);
    }

    // initialize user properties
    if (!this.userProperties) {
      this._createUserProperties(isTemporaryLocal);
   }
  }

  /**
   * Creates a new anonymous user
   * @param isTemporaryLocal - used when creating a local-only user while logging in
   * @returns identity model
   */
  private async _createAnonymousUser(isTemporaryLocal?: boolean): Promise<OSModel<IdentityModel>> {
    let data;

    if (isTemporaryLocal) {
      data = {
        onesignalId: "123", // mock data
      };
    } else {
      // TO DO: create user with HTTP request and get fresh onesignalId
      data = {
        // real uuid
        onesignalId: "00000000-0000-0000-0000-000000000000", // for now, use mock data
      };
    }

    this.identity = new OSModel<IdentityModel>(ModelName.Identity, data, undefined);
    this.awaitOneSignalIdAvailable = this.identity.awaitOneSignalIdAvailable;

    /**
     * If we are not creating a local temp user, we should set the real id on the identity model
     * This will resolve the awaitOneSignalIdAvailable promises on user and models to indicate
     * that the user is now identified
     */
    if (!isTemporaryLocal) {
      // set the onesignal id on the OSModel class-level property
      this.identity.setOneSignalId(data.onesignalId);
    }

    /**
     * Set the onesignal id on the OSModel `data` property
     * To keep the `OSModel` class model-agnostic, we do not want to add any Identity Model-specific code in the
     * `setOneSignalId` function. Therefore, we must manually set the onesignal id on the `data` property as well
     */
    // TO DO: cover with unit test
    this.identity.data.onesignalId = data.onesignalId;

    OneSignal.coreDirector.add(ModelName.Identity, this.identity as OSModel<SupportedModel>, false).catch(e => {
      Log.error(e);
    });

    // TO DO: populate subscription models also
    return this.identity;
  }

  private _createUserProperties(isTemporaryLocal?: boolean): void {
    const properties = {
      language: Environment.getLanguage(),
      timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    this.userProperties = new OSModel<UserPropertiesModel>(ModelName.Properties, properties);

    if (!isTemporaryLocal) {
      // TO DO: fix user id
      this.userProperties.setOneSignalId("00000000-0000-0000-0000-000000000000");
    }

    OneSignal.coreDirector.add(ModelName.Properties, this.userProperties as OSModel<SupportedModel>, false)
      .catch(e => {
        Log.error(e);
      });
  }
}
