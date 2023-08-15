import { ModelStoresMap } from "../models/ModelStoresMap";
import { ModelName } from "../models/SupportedModels";
import { OSModel } from "./OSModel";
import { OSModelStore } from "./OSModelStore";

export class OSModelStoreFactory {
  static build<Model>(cachedModels?: {[key: string]: OSModel<Model>[]}): ModelStoresMap<Model> {
    const modelStores: { [key in ModelName]?: unknown } = {};

    Object.values(ModelName).forEach(modelName => {
      const models = !!cachedModels ? cachedModels[modelName] : undefined;
      const modelStore = new OSModelStore<Model>(models);
      modelStores[modelName] = modelStore;
    });

    return modelStores as ModelStoresMap<Model>;
  }
}
