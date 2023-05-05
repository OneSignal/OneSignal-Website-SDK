import { logMethodCall } from "../shared/utils/utils";
import Log from "../shared/libraries/Log";
import CoreModule from "./CoreModule";
import { OSModel } from "./modelRepo/OSModel";
import { SupportedIdentity } from "./models/IdentityModel";
import { ModelStoresMap } from "./models/ModelStoresMap";
import { SubscriptionModel, SupportedSubscription } from "./models/SubscriptionModels";
import { ModelName, SupportedModel } from "./models/SupportedModels";
import { UserPropertiesModel } from "./models/UserPropertiesModel";
import UserData from "./models/UserData";
import OneSignalError from "../shared/errors/OneSignalError";
import MainHelper from "../shared/helpers/MainHelper";
import { RawPushSubscription } from "../shared/models/RawPushSubscription";
import FuturePushSubscriptionRecord from "../page/userModel/FuturePushSubscriptionRecord";
import User from "../onesignal/User";
import OneSignal from "../onesignal/OneSignal";
import Database from "../shared/services/Database";

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {

  constructor(private core: CoreModule) {}

  public generatePushSubscriptionModel(rawPushSubscription: RawPushSubscription): void {
    logMethodCall("CoreModuleDirector.generatePushSubscriptionModel", { rawPushSubscription });
    // new subscription
    const pushModel = new OSModel<SupportedSubscription>(
      ModelName.PushSubscriptions,
      new FuturePushSubscriptionRecord(rawPushSubscription).serialize()
    );

    const user = User.createOrGetInstance();
    if (user.hasOneSignalId) {
      pushModel.setOneSignalId(user.onesignalId);
    }
    // don't propagate since we will be including the subscription in the user create call
    OneSignal.coreDirector.add(ModelName.PushSubscriptions, pushModel as OSModel<SupportedModel>, false);
  }

  public async resetModelRepoAndCache(): Promise<void> {
    await this.core.resetModelRepoAndCache();
  }

  public hydrateUser(user: UserData): void {
    logMethodCall("CoreModuleDirector.hydrateUser", { user });
    try {
      const identity = this.getIdentityModel();
      const properties = this.getPropertiesModel();

      const { onesignal_id: onesignalId } = user.identity;

      if (!onesignalId) {
        throw new OneSignalError("OneSignal ID is missing from user data");
      }

      // set OneSignal ID *before* hydrating models so that the onesignalId is also updated in model cache
      identity?.setOneSignalId(onesignalId);
      properties?.setOneSignalId(onesignalId);

      // identity and properties models are always single, so we hydrate immediately (i.e. replace existing data)
      identity?.hydrate(user.identity);
      properties?.hydrate(user.properties);

      // subscriptions are duplicable, so we hydrate them separately
      // when hydrating, we should have the full subscription object (i.e. include ID from server)
      this._hydrateSubscriptions(user.subscriptions as SubscriptionModel[], onesignalId);
    } catch (e) {
      Log.error(`Error hydrating user: ${e}`);
    }
  }

  private _hydrateSubscriptions(subscriptions: SubscriptionModel[], onesignalId: string): void {
    logMethodCall("CoreModuleDirector._hydrateSubscriptions", { subscriptions });

    if (!subscriptions) {
      return;
    }

    const modelStores = this.getModelStores();

    const getModelName = (subscription: SupportedSubscription) => {
      if (subscription.type === "Email") {
        return ModelName.EmailSubscriptions;
      } else if (subscription.type === "SMS") {
        return ModelName.SmsSubscriptions;
      } else {
        return ModelName.PushSubscriptions;
      }
    };

    subscriptions.forEach(async subscription => {
      const modelName = getModelName(subscription);
      /* We use the token to identify the model because the subscription ID is not set until the server responds.
       * So when we initially hydrate after init, we may already have a push model with a token, but no ID.
       * We don't want to create a new model in this case, so we use the token to identify the model.
       */
      const existingSubscription = !!subscription.token ?
        this.getSubscriptionOfTypeWithToken(modelName, subscription.token) :
        undefined;

      if (existingSubscription) {
        // set onesignalId on existing subscription *before* hydrating so that the onesignalId is updated in model cache
        existingSubscription.setOneSignalId(onesignalId);
        existingSubscription.hydrate(subscription);
      } else {
        const model = new OSModel<SupportedModel>(modelName, subscription);
        model.setOneSignalId(onesignalId);
        modelStores[modelName].add(model, false); // don't propagate to server
      }
    });
  }

  // call processDeltaQueue on all executors immediately
  public forceDeltaQueueProcessingOnAllExecutors(): void {
    logMethodCall("CoreModuleDirector.forceDeltaQueueProcessingOnAllExecutors");
    this.core.forceDeltaQueueProcessingOnAllExecutors();
  }

  /* O P E R A T I O N S */

  public add(modelName: ModelName, model: OSModel<SupportedModel>, propagate: boolean = true): void {
    logMethodCall("CoreModuleDirector.add", { modelName, model });
    const modelStores = this.getModelStores();
    modelStores[modelName].add(model, propagate);
  }

  public remove(modelName: ModelName, modelId: string): void {
    logMethodCall("CoreModuleDirector.remove", { modelName, modelId });
    const modelStores = this.getModelStores();
    modelStores[modelName].remove(modelId);
  }

  /* G E T T E R S */

  public getModelByTypeAndId(modelName: ModelName, modelId: string): OSModel<SupportedModel> | undefined {
      logMethodCall("CoreModuleDirector.getModelByTypeAndId", { modelName, modelId });
      const modelStores = this.getModelStores();
      return modelStores[modelName].models[modelId];
  }

  public getEmailSubscriptionModels(): { [key: string]: OSModel<SupportedSubscription> } {
    logMethodCall("CoreModuleDirector.getEmailSubscriptionModels");
    const modelStores = this.getModelStores();
    return modelStores.emailSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  public getSmsSubscriptionModels(): { [key: string]: OSModel<SupportedSubscription> } {
    logMethodCall("CoreModuleDirector.getSmsSubscriptionModels");
    const modelStores = this.getModelStores();
    return modelStores.smsSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  /**
   * Returns all push subscription models, including push subscriptions from other browsers.
   */
  public getAllPushSubscriptionModels(): { [key: string]: OSModel<SupportedSubscription> } {
    logMethodCall("CoreModuleDirector.getAllPushSubscriptionModels");
    const modelStores = this.getModelStores();
    return modelStores.pushSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  /**
   * Gets the current push subscription model for the current browser.
   * @returns The push subscription model for the current browser, or undefined if no push subscription exists.
   */
  // TO DO: make synchronous by making getting the current push token synchronous
  public async getCurrentPushSubscriptionModel(): Promise<OSModel<SupportedSubscription> | undefined> {
    logMethodCall("CoreModuleDirector.getPushSubscriptionModel");
    let pushToken = await MainHelper.getCurrentPushToken();

    if (!pushToken) {
      const appState = await Database.getAppState();
      pushToken = appState.lastKnownPushToken;

      if (!pushToken) {
        Log.debug("No push token found, returning undefined");
        return undefined;
      }
    }
    return this.getSubscriptionOfTypeWithToken(ModelName.PushSubscriptions, pushToken);
  }

  public getIdentityModel(): OSModel<SupportedIdentity> | undefined {
    logMethodCall("CoreModuleDirector.getIdentityModel");
    const modelStores = this.getModelStores();
    const modelKeys = Object.keys(modelStores.identity.models);
    return modelStores.identity.models[modelKeys[0]] as OSModel<SupportedIdentity>;
  }

  public getPropertiesModel(): OSModel<UserPropertiesModel> | undefined {
    logMethodCall("CoreModuleDirector.getPropertiesModel");
    const modelStores = this.getModelStores();
    const modelKeys = Object.keys(modelStores.properties.models);
    return modelStores.properties.models[modelKeys[0]] as OSModel<UserPropertiesModel>;
  }

  public async getAllSubscriptionsModels(): Promise<OSModel<SupportedSubscription>[]> {
    logMethodCall("CoreModuleDirector.getAllSubscriptionsModels");
    const emailSubscriptions = this.getEmailSubscriptionModels();
    const smsSubscriptions = this.getSmsSubscriptionModels();
    const pushSubscription = await this.getCurrentPushSubscriptionModel();

    const subscriptions = Object.values(emailSubscriptions)
      .concat(Object.values(smsSubscriptions))
      .concat(pushSubscription ? [pushSubscription] : []);
    return subscriptions;
  }

  public getSubscriptionOfTypeWithToken(type: ModelName, token: string): OSModel<SupportedSubscription> | undefined
    {
      logMethodCall("CoreModuleDirector.getSubscriptionOfTypeWithToken", { type, token });
      switch (type) {
        case ModelName.EmailSubscriptions:
          const emailSubscriptions = this.getEmailSubscriptionModels();
          return Object.values(emailSubscriptions).find(subscription => subscription.data.token === token);
        case ModelName.SmsSubscriptions:
          const smsSubscriptions = this.getSmsSubscriptionModels();
          return Object.values(smsSubscriptions).find(subscription => subscription.data.token === token);
        case ModelName.PushSubscriptions:
          const pushSubscriptions = this.getAllPushSubscriptionModels();
          return Object.values(pushSubscriptions).find(subscription => subscription.data.token === token);
        default:
          return undefined;
      }
  }

  /* P R I V A T E */

  private getModelStores(): ModelStoresMap<SupportedModel> {
    return (this.core.modelRepo?.modelStores as ModelStoresMap<SupportedModel>);
  }
}
