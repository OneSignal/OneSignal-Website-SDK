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

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  private initPromise: Promise<void>;

  constructor(private core: CoreModule) {
    this.initPromise = core.initPromise.then(() => {}).catch(e => {
      Log.error(e);
    });
  }

  public async generatePushSubscriptionModel(rawPushSubscription: RawPushSubscription): Promise<void> {
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
    await OneSignal.coreDirector.add(ModelName.PushSubscriptions, pushModel as OSModel<SupportedModel>, false);
  }

  public async resetModelRepoAndCache(): Promise<void> {
    await this.core.resetModelRepoAndCache();
  }

  public async hydrateUser(user: UserData): Promise<void> {
    logMethodCall("CoreModuleDirector.hydrateUser", { user });
    try {
      await this.initPromise;
      const identity = await this.getIdentityModel();
      const properties = await this.getPropertiesModel();

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
      this._hydrateSubscriptions(user.subscriptions as SubscriptionModel[], onesignalId).catch(e => {
        throw new OneSignalError(`Error hydrating subscriptions: ${e}`);
      });
    } catch (e) {
      Log.error(`Error hydrating user: ${e}`);
    }
  }

  private async _hydrateSubscriptions(subscriptions: SubscriptionModel[], onesignalId: string): Promise<void> {
    logMethodCall("CoreModuleDirector._hydrateSubscriptions", { subscriptions });

    if (!subscriptions) {
      return;
    }

    await this.initPromise;
    const modelStores = await this.getModelStores();

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
        await this.getSubscriptionOfTypeWithToken(modelName, subscription.token) :
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

  /* O P E R A T I O N S */

  public async add(modelName: ModelName, model: OSModel<SupportedModel>, propagate: boolean = true): Promise<void> {
    logMethodCall("CoreModuleDirector.add", { modelName, model });
    const modelStores = await this.getModelStores();
    modelStores[modelName].add(model, propagate);
  }

  public async remove(modelName: ModelName, modelId: string): Promise<void> {
    logMethodCall("CoreModuleDirector.remove", { modelName, modelId });
    const modelStores = await this.getModelStores();
    modelStores[modelName].remove(modelId);
  }

  /* G E T T E R S */

  public async getModelByTypeAndId(modelName: ModelName, modelId: string):
    Promise<OSModel<SupportedModel> | undefined> {
      logMethodCall("CoreModuleDirector.getModelByTypeAndId", { modelName, modelId });
      await this.initPromise;
      const modelStores = await this.getModelStores();
      return modelStores[modelName].models[modelId];
  }

  public async getEmailSubscriptionModels(): Promise<{ [key: string]: OSModel<SupportedSubscription> }> {
    logMethodCall("CoreModuleDirector.getEmailSubscriptionModels");
    await this.initPromise;
    const modelStores = await this.getModelStores();
    return modelStores.emailSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  public async getSmsSubscriptionModels(): Promise<{ [key: string]: OSModel<SupportedSubscription> }> {
    logMethodCall("CoreModuleDirector.getSmsSubscriptionModels");
    await this.initPromise;
    const modelStores = await this.getModelStores();
    return modelStores.smsSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  /**
   * Returns all push subscription models, including push subscriptions from other browsers.
   */
  public async getAllPushSubscriptionModels(): Promise<{ [key: string]: OSModel<SupportedSubscription> }> {
    logMethodCall("CoreModuleDirector.getAllPushSubscriptionModels");
    await this.initPromise;
    const modelStores = await this.getModelStores();
    return modelStores.pushSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  /**
   * Gets the current push subscription model for the current browser.
   * @returns The push subscription model for the current browser, or undefined if no push subscription exists.
   */
  public async getCurrentPushSubscriptionModel(): Promise<OSModel<SupportedSubscription> | undefined> {
    logMethodCall("CoreModuleDirector.getPushSubscriptionModel");
    await this.initPromise;
    const pushToken = await MainHelper.getCurrentPushToken();

    if (!pushToken) {
      Log.warn("No push token found, returning undefined from getPushSubscriptionModel()");
      return undefined;
    }
    return this.getSubscriptionOfTypeWithToken(ModelName.PushSubscriptions, pushToken);
  }

  public async getIdentityModel(): Promise<OSModel<SupportedIdentity> | undefined> {
    logMethodCall("CoreModuleDirector.getIdentityModel");
    await this.initPromise;
    const modelStores = await this.getModelStores();
    const modelKeys = Object.keys(modelStores.identity.models);
    return modelStores.identity.models[modelKeys[0]] as OSModel<SupportedIdentity>;
  }

  public async getPropertiesModel(): Promise<OSModel<UserPropertiesModel> | undefined> {
    logMethodCall("CoreModuleDirector.getPropertiesModel");
    await this.initPromise;
    const modelStores = await this.getModelStores();
    const modelKeys = Object.keys(modelStores.properties.models);
    return modelStores.properties.models[modelKeys[0]] as OSModel<UserPropertiesModel>;
  }

  public async getAllSubscriptionsModels(): Promise<OSModel<SupportedSubscription>[]> {
    logMethodCall("CoreModuleDirector.getAllSubscriptionsModels");
    await this.initPromise;
    const emailSubscriptions = await this.getEmailSubscriptionModels();
    const smsSubscriptions = await this.getSmsSubscriptionModels();
    const pushSubscription = await this.getCurrentPushSubscriptionModel();

    const subscriptions = Object.values(emailSubscriptions)
      .concat(Object.values(smsSubscriptions))
      .concat(pushSubscription ? [pushSubscription] : []);
    return subscriptions;
  }

  public async getSubscriptionOfTypeWithToken(type: ModelName, token: string):
    Promise<OSModel<SupportedSubscription> | undefined>
    {
      logMethodCall("CoreModuleDirector.getSubscriptionOfTypeWithToken", { type, token });
      await this.initPromise;
      switch (type) {
        case ModelName.EmailSubscriptions:
          const emailSubscriptions = await this.getEmailSubscriptionModels();
          return Object.values(emailSubscriptions).find(subscription => subscription.data.token === token);
        case ModelName.SmsSubscriptions:
          const smsSubscriptions = await this.getSmsSubscriptionModels();
          return Object.values(smsSubscriptions).find(subscription => subscription.data.token === token);
        case ModelName.PushSubscriptions:
          const pushSubscriptions = await this.getAllPushSubscriptionModels();
          return Object.values(pushSubscriptions).find(subscription => subscription.data.token === token);
        default:
          return undefined;
      }
  }

  /* P R I V A T E */

  private async getModelStores(): Promise<ModelStoresMap<SupportedModel>> {
    await this.initPromise;
    return (this.core.modelRepo?.modelStores as ModelStoresMap<SupportedModel>);
  }
}
