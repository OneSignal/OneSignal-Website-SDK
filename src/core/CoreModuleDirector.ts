import { logMethodCall } from "../shared/utils/utils";
import Log from "../shared/libraries/Log";
import CoreModule from "./CoreModule";
import { OSModel } from "./modelRepo/OSModel";
import { SupportedIdentity } from "./models/IdentityModel";
import { ModelStoresMap } from "./models/ModelStoresMap";
import { SupportedSubscription } from "./models/SubscriptionModels";
import { ModelName, SupportedModel } from "./models/SupportedModels";
import { UserPropertiesModel } from "./models/UserPropertiesModel";
import User from "../onesignal/User";
import UserData from "./models/UserData";
import OneSignalError from "../shared/errors/OneSignalError";
import OneSignal from "../onesignal/OneSignal";

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  private initPromise: Promise<void>;

  constructor(private core: CoreModule) {
    this.initPromise = core.initPromise.then(() => {}).catch(e => {
      Log.error(e);
    });
  }

  /* L O G I N */

  /**
   * Reset user - used to reset user data when user logs in and out
   * @param isTempUser - used when creating a local-only temporary user while logging in
   */
  public async resetUserWithSetting(isTempUser: boolean): Promise<void> {
    await this.core.resetModelRepoAndCache();

    const user = User.createOrGetInstance();
    user.flushModelReferences();
    await user.setupNewUser(isTempUser);
    await OneSignal.user.pushSubscription._resubscribeToPushModelChanges();
  }

  public async hydrateUser(user: UserData): Promise<void> {
    logMethodCall("CoreModuleDirector.hydrateUser", { user });
    await this.initPromise;
    const identity = await this.getIdentityModel();
    const properties = await this.getPropertiesModel();

    identity?.hydrate(user.identity);
    properties?.hydrate(user.properties);

    const { onesignalId } = user.identity;

    if (!onesignalId) {
      throw new OneSignalError("OneSignal ID is missing from user data");
    }

    identity?.setOneSignalId(onesignalId);
    properties?.setOneSignalId(onesignalId);

    this._hydrateSubscriptions(user.subscriptions, onesignalId).catch(e => {
      Log.error(`Error hydrating subscriptions: ${e}`);
    });
  }

  private async _hydrateSubscriptions(subscriptions: SupportedSubscription[], onesignalId: string): Promise<void> {
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

    subscriptions.forEach(subscription => {
      const modelName = getModelName(subscription);
      const model = new OSModel<SupportedModel>(modelName, subscription);
      model.setOneSignalId(onesignalId);
      modelStores[modelName].add(model, true);
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

  public async getPushSubscriptionModel(): Promise<OSModel<SupportedSubscription> | undefined> {
    logMethodCall("CoreModuleDirector.getPushSubscriptionModels");
    await this.initPromise;
    const modelStores = await this.getModelStores();
    const key = Object.keys(modelStores.pushSubscriptions.models)[0];
    return modelStores.pushSubscriptions.models[key] as OSModel<SupportedSubscription>;
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
    const pushSubscription = await this.getPushSubscriptionModel();

    const subscriptions = Object.values(emailSubscriptions)
      .concat(Object.values(smsSubscriptions))
      .concat(pushSubscription ? [pushSubscription] : []);
    return subscriptions;
  }

  /* P R I V A T E */

  private async getModelStores(): Promise<ModelStoresMap<SupportedModel>> {
    await this.initPromise;
    return (this.core.modelRepo?.modelStores as ModelStoresMap<SupportedModel>);
  }
}
