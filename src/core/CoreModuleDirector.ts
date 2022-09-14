import Log from "../shared/libraries/Log";
import CoreModule from "./CoreModule";
import { OSModel } from "./modelRepo/OSModel";
import { OSModelStoresMap } from "./models/OSModelStoresMap";
import { SupportedSubscription } from "./models/SubscriptionModels";
import { ModelName, SupportedModel } from "./models/SupportedModels";

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

  public async remove(modelName: ModelName, id: string): Promise<void> {
    const modelStores = await this.getModelStores();
    modelStores[modelName].remove(id);
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

  public async getPushSubscriptionModels(): Promise<{ [key: string]: OSModel<SupportedSubscription> }> {
    await this.initPromise;
    const modelStores = await this.getModelStores();
    return modelStores.pushSubscriptions.models as { [key: string]: OSModel<SupportedSubscription> };
  }

  private async getModelStores(): Promise<OSModelStoresMap<SupportedModel>> {
    await this.initPromise;
    return (this.core.modelRepo?.modelStores as OSModelStoresMap<SupportedModel>);
  }
}
