import Environment from "../shared/helpers/Environment";
import { OSModel } from "../core/modelRepo/OSModel";
import { IdentityModel, SupportedIdentity } from "../core/models/IdentityModel";
import { SupportedSubscription } from "../core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { UserPropertiesModel } from "../core/models/UserPropertiesModel";
import OneSignal from "./OneSignal";
import Log from "../shared/libraries/Log";
import { RequestService } from "../core/requestService/RequestService";
import UserData from "../core/models/UserData";
import MainHelper from "../shared/helpers/MainHelper";
import { isIdentityObject } from "../core/utils/typePredicates";
import OneSignalError from "../shared/errors/OneSignalError";

export default class User {
  hasOneSignalId: boolean = false;
  onesignalId?: string;
  awaitOneSignalIdAvailable?: Promise<string>;
  isCreatingUser: boolean = false;

  static singletonInstance?: User = undefined;

  private constructor(
    public identity?: OSModel<SupportedIdentity>,
    public userProperties?: OSModel<UserPropertiesModel>,
    // TO DO: explore option to consolidate into a single subscriptions property
    // Might have to make changes to avoid iteration to find correct model we want to modify
    public pushSubscription?: OSModel<SupportedSubscription>,
    public smsSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
    public emailSubscriptions?: { [key: string]: OSModel<SupportedSubscription> },
  ) {

    this._copyOneSignalIdPromiseFromIdentityModel();
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
    identity?: OSModel<SupportedIdentity>,
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
    this.pushSubscription = undefined;
    this.smsSubscriptions = undefined;
    this.emailSubscriptions = undefined;
  }

  /**
   * Sets up a new user
   * @param isTempUser - used when creating a local-only temporary user while logging in
   */
  public async setupNewUser(isTempUser?: boolean): Promise<void> {
    this.hasOneSignalId = false;
    this.awaitOneSignalIdAvailable = undefined;
    this.isCreatingUser = false;

    try {
      // if not loaded from cache, initialize new user
      if (!this.identity) {
        this.identity = await this._createAnonymousUser(isTempUser);
      }

      // initialize user properties
      if (!this.userProperties) {
        this._createUserProperties(isTempUser);
      }
    } catch (e) {
      Log.error(`Error setting up new user: ${e}`);
    }
  }

  async sendUserCreate(): Promise<IdentityModel | void> {
    if (this.hasOneSignalId || this.isCreatingUser) {
      return;
    }

    this.isCreatingUser = true;

    try {
      await this._refreshModels();
      const appId = await MainHelper.getAppId();
      const userData = await this._generateUserDataPayload();
      const response = await RequestService.createUser({ appId }, userData);
      const userDataResponse: UserData = response.result;
      await OneSignal.coreDirector.hydrateUser(userDataResponse);
      this.isCreatingUser = false;
    } catch (e) {
      Log.error(`Error sending user create: ${e}`);
    }
  }

  private async _refreshModels(): Promise<void> {
    const identityModel = await OneSignal.coreDirector.getIdentityModel();
    const userPropertiesModel = await OneSignal.coreDirector.getPropertiesModel();
    const pushSubscription = await OneSignal.coreDirector.getCurrentPushSubscriptionModel();
    const emailSubscriptions = await OneSignal.coreDirector.getEmailSubscriptionModels();
    const smsSubscriptions = await OneSignal.coreDirector.getSmsSubscriptionModels();

    this.identity = identityModel;
    this.userProperties = userPropertiesModel;
    this.pushSubscription = pushSubscription;
    this.emailSubscriptions = emailSubscriptions;
    this.smsSubscriptions = smsSubscriptions;
  }

  /**
   * Creates a new anonymous user
   * @param isTempUser - used when creating a local-only user while logging in
   * @returns identity model
   */
  private async _createAnonymousUser(isTempUser?: boolean): Promise<OSModel<SupportedIdentity>> {
    let identityModel;

    if (isTempUser) {
      identityModel = {};
    } else {
      identityModel = await this.sendUserCreate();

      if (!isIdentityObject(identityModel)) {
        throw new OneSignalError("Invalid user create response");
      }
    }

    this.identity = new OSModel<SupportedIdentity>(ModelName.Identity, identityModel);
    this._copyOneSignalIdPromiseFromIdentityModel();

    /**
     * If we are not creating a local temp user, we should set the real id on the identity model
     * This will resolve the awaitOneSignalIdAvailable promises on user and models to indicate
     * that the user is now identified
     */
    if (!isTempUser) {
      // set the onesignal id on the OSModel class-level property
      this.identity.setOneSignalId(identityModel.onesignal_id);
    }

    /**
     * Set the onesignal id on the OSModel `data` property
     * To keep the `OSModel` class model-agnostic, we do not want to add any Identity Model-specific code in the
     * `setOneSignalId` function. Therefore, we must manually set the onesignal id on the `data` property as well
     */
    // TO DO: cover with unit test
    this.identity.data.onesignal_id = identityModel.onesignal_id;

    OneSignal.coreDirector.add(ModelName.Identity, this.identity as OSModel<SupportedModel>, false).catch(e => {
      Log.error(e);
    });

    return this.identity;
  }

  private _createUserProperties(isTempUser?: boolean): void {
    this.userProperties = new OSModel<UserPropertiesModel>(ModelName.Properties, this._generateUserPropertiesData());

    if (!isTempUser) {
      this.userProperties.setOneSignalId(this.identity?.onesignalId);
    }

    OneSignal.coreDirector.add(ModelName.Properties, this.userProperties as OSModel<SupportedModel>, false)
      .catch(e => {
        Log.error(e);
      });
  }


  /**
   * Generates the user data payload to send to the server on user create
   * @returns user data payload
   */
  private async _generateUserDataPayload(): Promise<Partial<UserData>> {
    const pushSub = this.pushSubscription ? [this.pushSubscription.data] : [];
    const emailSubs = this.emailSubscriptions ?
      Object.values(this.emailSubscriptions).map(subscription => subscription.data) : [];
    const smsSubs = this.smsSubscriptions ?
      Object.values(this.smsSubscriptions).map(subscription => subscription.data) : [];

    return {
      identity: this.identity?.data,
      properties: this.userProperties?.data,
      subscriptions: [
        ...pushSub,
        ...emailSubs,
        ...smsSubs,
      ],
    };
  }

  private _generateUserPropertiesData(): UserPropertiesModel {
    return {
      language: Environment.getLanguage(),
      timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private _copyOneSignalIdPromiseFromIdentityModel() {
    // copy the onesignal id promise to the user
    this.awaitOneSignalIdAvailable = this.identity?.awaitOneSignalIdAvailable;

    this.awaitOneSignalIdAvailable?.then((onesignalId: string) => {
      this.hasOneSignalId = true;
      this.onesignalId = onesignalId;
    });
  }
}
