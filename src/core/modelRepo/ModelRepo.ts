import ModelCache from "../caching/ModelCache";
import Subscribable from "../Subscribable";
import { CoreChangeType } from "../models/CoreChangeType";
import { CoreDelta } from "../models/CoreDeltas";
import { ModelStoresMap } from "../models/ModelStoresMap";
import { SupportedModel, ModelName } from "../models/SupportedModels";
import { ModelStoreChange, ModelStoreAdded, ModelStoreRemoved, ModelStoreUpdated } from "../models/ModelStoreChange";

export class ModelRepo extends Subscribable<CoreDelta<SupportedModel>> {
  constructor(private modelCache: ModelCache, public modelStores: ModelStoresMap<SupportedModel>) {
    super();
    Object.keys(modelStores).forEach(modelName => {
      modelStores[modelName as ModelName].subscribe(this.processModelChange.bind(this));
    });
  }

  private processModelChange(modelStoreChange: ModelStoreChange<SupportedModel>): void {
    if (modelStoreChange.type === CoreChangeType.Add) {
      this.processModelAdded(modelStoreChange);
    }

    if (modelStoreChange.type === CoreChangeType.Remove) {
      this.processModelRemoved(modelStoreChange);
    }

    if (modelStoreChange.type === CoreChangeType.Update) {
      this.processModelUpdated(modelStoreChange);
    }
  }

  private processModelAdded(modelStoreChange: ModelStoreChange<SupportedModel>): void {
    const { payload, noRemoteSync } = modelStoreChange as ModelStoreAdded<SupportedModel>;

    // sync to cache
    this.modelCache.add(payload.modelName, payload);

    // broadcast deltas
    if (!noRemoteSync) {
      this.broadcast({
        model: payload,
        changeType: CoreChangeType.Add,
      });
    }
  }

  private processModelRemoved(modelStoreChange: ModelStoreChange<SupportedModel>): void {
    const { id, payload, noRemoteSync } = modelStoreChange as ModelStoreRemoved<SupportedModel>;

    // sync to cache
    this.modelCache.remove(payload.modelName, id);

    // broadcast deltas
    if (!noRemoteSync) {
      this.broadcast({
        model: payload,
        changeType: CoreChangeType.Remove,
      });
    }

  }

  private processModelUpdated(modelStoreChange: ModelStoreChange<SupportedModel>): void {
    const { id, payload, noRemoteSync } = modelStoreChange as ModelStoreUpdated<SupportedModel>;

    // sync to cache
    this.modelCache.update(payload.model.modelName, id, payload.property, payload.newValue);

    // broadcast deltas
    if (!noRemoteSync && payload.oldValue !== payload.newValue) {
      const delta = {
        model: payload.model,
        changeType: CoreChangeType.Update,
        property: payload.property,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
      };
      this.broadcast(delta);
    }
  }

  /* S T A T I C */
  static supportedModels: ModelName[] = Object.values(ModelName);
}
