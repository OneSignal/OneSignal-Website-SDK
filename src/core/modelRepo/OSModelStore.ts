import Subscribable from '../Subscribable';
import { CoreChangeType } from '../models/CoreChangeType';
import {
  ModelStoreAdded,
  ModelStoreChange,
  ModelStoreHydrated,
  ModelStoreRemoved,
  ModelStoreUpdated,
} from '../models/ModelStoreChange';
import { isOSModel, isOSModelUpdatedArgs } from '../utils/typePredicates';
import { OSModel } from './OSModel';

// TODO: Remove this later as part of the Web SDK Refactor
export class OSModelStore<Model> extends Subscribable<ModelStoreChange<Model>> {
  public models: { [key: string]: OSModel<Model> } = {};
  public unsubscribeCallbacks: { [key: string]: () => void } = {};

  constructor(modelArray: OSModel<Model>[] = []) {
    super();
    modelArray.forEach((model) => {
      this.models[model.modelId] = model;
      this.subscribeUpdateListener(model);
    });
  }

  public add(model: OSModel<Model>, propagate: boolean): void {
    this.subscribeUpdateListener(model);
    this.models[model.modelId] = model;

    if (propagate) {
      this.broadcast(new ModelStoreAdded(model.modelId, model));
    } else {
      this.broadcast(new ModelStoreHydrated(model.modelId, model));
    }
  }

  public remove(modelId: string): void {
    const modelCopy = JSON.stringify(this.models[modelId]);
    delete this.models[modelId];
    this.unsubscribeCallbacks[modelId]();
    this.broadcast(new ModelStoreRemoved(modelId, JSON.parse(modelCopy)));
  }

  private subscribeUpdateListener(model: OSModel<Model>): void {
    this.unsubscribeCallbacks[model.modelId] = model.subscribe(
      (change: ModelStoreChange<Model>) => {
        const { payload } = change;

        if (
          change.type === CoreChangeType.Update &&
          isOSModelUpdatedArgs<Model>(payload)
        ) {
          this.broadcast(new ModelStoreUpdated(model.modelId, payload));
        } else if (
          change.type === CoreChangeType.Hydrate &&
          isOSModel<Model>(payload)
        ) {
          this.broadcast(new ModelStoreHydrated(model.modelId, payload));
        }
      },
    );
  }
}
