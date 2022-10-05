import Log from "../shared/libraries/Log";
import CoreModule from "./CoreModule";
import { OSModel } from "./modelRepo/OSModel";
import { IdentityModel } from "./models/IdentityModel";
import { ModelStoresMap } from "./models/ModelStoresMap";
import { SupportedSubscription } from "./models/SubscriptionModels";
import { ModelName, SupportedModel } from "./models/SupportedModels";
import { UserPropertiesModel } from "./models/UserPropertiesModel";

/* Contains OneSignal User-Model-specific logic*/

export class CoreModuleDirector {
  private initPromise: Promise<void>;

  constructor(private core: CoreModule) {
    this.initPromise = core.initPromise.then(() => {}).catch(e => {
      Log.error(e);
    });
  }

  public async add(modelName: ModelName, model: OSModel<SupportedModel>): Promise<void> {
    const modelStores = await this.getModelStores();
    modelStores[modelName].add(model);
  }

  public async remove(modelName: ModelName, modelId: string): Promise<void> {
    const modelStores = await this.getModelStores();
    modelStores[modelName].remove(modelId);
  }

  public async getEmailSubscriptionModels(): Promise<{ [key: string]: OSModel<SupportedSubscription> }> {
    await this.initPromise;
    const modelStores = await this.getModelStores();
    return modelStores.emailSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  public async getSmsSubscriptionModels(): Promise<{ [key: string]: OSModel<SupportedSubscription> }> {
    await this.initPromise;
    const modelStores = await this.getModelStores();
    return modelStores.smsSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  public async getPushSubscriptionModels(): Promise<OSModel<SupportedSubscription> | undefined> {
    await this.initPromise;
    const modelStores = await this.getModelStores();
    const key = Object.keys(modelStores.pushSubscriptions.models)[0];
    return modelStores.pushSubscriptions.models[key] as OSModel<SupportedSubscription>;
  }

  public async getIdentityModel(): Promise<OSModel<IdentityModel>> {
    await this.initPromise;
    const modelStores = await this.getModelStores();
    const modelKeys = Object.keys(modelStores.identity.models);
    return modelStores.identity.models[modelKeys[0]] as OSModel<IdentityModel>;
  }

  public async getPropertiesModel(): Promise<OSModel<UserPropertiesModel>> {
    await this.initPromise;
    const modelStores = await this.getModelStores();
    const modelKeys = Object.keys(modelStores.properties.models);
    return modelStores.properties.models[modelKeys[0]] as OSModel<UserPropertiesModel>;
  }

  /* P R I V A T E */

  private async getModelStores(): Promise<ModelStoresMap<SupportedModel>> {
    await this.initPromise;
    return (this.core.modelRepo?.modelStores as ModelStoresMap<SupportedModel>);
  }
}
