import ModelCache from '../caching/ModelCache';
import Subscribable from '../Subscribable';
import { CoreChangeType } from '../models/CoreChangeType';
import { CoreDelta } from '../models/CoreDeltas';
import { ModelStoresMap } from '../models/ModelStoresMap';
import { SupportedModel, ModelName } from '../models/SupportedModels';
import {
  ModelStoreChange,
  ModelStoreAdded,
  ModelStoreRemoved,
  ModelStoreUpdated,
  ModelStoreHydrated,
} from '../models/ModelStoreChange';
import { logMethodCall } from '../../shared/utils/utils';

export class ModelRepo extends Subscribable<CoreDelta<SupportedModel>> {
  constructor(
    private modelCache: ModelCache,
    public modelStores: ModelStoresMap<SupportedModel>,
  ) {
    super();
    Object.keys(modelStores).forEach((modelName) => {
      modelStores[modelName as ModelName].subscribe(
        this.processModelChange.bind(this),
      );
    });
  }

  private processModelChange(
    modelStoreChange: ModelStoreChange<SupportedModel>,
  ): void {
    logMethodCall('processModelChange', { modelStoreChange });
    if (modelStoreChange.type === CoreChangeType.Add) {
      this.processModelAdded(modelStoreChange);
    }

    if (modelStoreChange.type === CoreChangeType.Remove) {
      this.processModelRemoved(modelStoreChange);
    }

    if (modelStoreChange.type === CoreChangeType.Update) {
      this.processModelUpdated(modelStoreChange);
    }

    if (modelStoreChange.type === CoreChangeType.Hydrate) {
      this.processModelHydrated(modelStoreChange);
    }
  }

  private processModelAdded(
    modelStoreChange: ModelStoreChange<SupportedModel>,
  ): void {
    logMethodCall('processModelAdded', { modelStoreChange });
    const { payload } = modelStoreChange as ModelStoreAdded<SupportedModel>;

    // sync to cache
    this.modelCache.add(payload.modelName, payload);

    // broadcast deltas
    this.broadcast({
      model: payload,
      changeType: CoreChangeType.Add,
    });
  }

  private processModelRemoved(
    modelStoreChange: ModelStoreChange<SupportedModel>,
  ): void {
    logMethodCall('processModelRemoved', { modelStoreChange });
    const { modelId, payload } =
      modelStoreChange as ModelStoreRemoved<SupportedModel>;

    // sync to cache
    this.modelCache.remove(payload.modelName, modelId);

    // broadcast deltas
    this.broadcast({
      model: payload,
      changeType: CoreChangeType.Remove,
    });
  }

  private processModelUpdated(
    modelStoreChange: ModelStoreChange<SupportedModel>,
  ): void {
    logMethodCall('processModelUpdated', { modelStoreChange });
    const { modelId, payload } =
      modelStoreChange as ModelStoreUpdated<SupportedModel>;

    // sync to cache
    this.modelCache.update(
      payload.model.modelName,
      modelId,
      payload.property,
      payload.newValue,
    );

    // broadcast deltas
    if (payload.oldValue !== payload.newValue) {
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

  processModelHydrated(modelStoreChange: ModelStoreChange<SupportedModel>) {
    logMethodCall('processModelHydrated', { modelStoreChange });
    const { modelId, payload } =
      modelStoreChange as ModelStoreHydrated<SupportedModel>;

    // sync to cache
    this.modelCache.remove(payload.modelName, modelId);
    this.modelCache.add(payload.modelName, payload);
  }

  /* S T A T I C */
  static supportedModels: ModelName[] = Object.values(ModelName);
}
