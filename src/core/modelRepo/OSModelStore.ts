import { OSModel } from "./OSModel";
import { OSModelUpdatedArgs } from "./OSModelUpdatedArgs";
import Subscribable from "../Subscribable";
import { ModelStoreChange, ModelStoreAdded, ModelStoreRemoved, ModelStoreUpdated } from "../models/ModelStoreChange";

export class OSModelStore<Model>
  extends Subscribable<ModelStoreChange<Model>>
  {
    public models: {[key: string]: OSModel<Model>} = {};
    public unsubscribeCallbacks: {[key: string]: () => void} = {};

    constructor(modelArray: OSModel<Model>[] = []) {
      super();
      modelArray.forEach(model => {
        this.models[model.id] = model;
        this.subscribeUpdateListener(model);
      });
    }

    public add(model: OSModel<Model>, noRemoteSync?: boolean): void {
      this.subscribeUpdateListener(model);
      this.models[model.id] = model;
      this.broadcast(new ModelStoreAdded(model.id, model, noRemoteSync));
    }

    public remove(id: string, noRemoteSync?: boolean): void {
      const modelCopy = JSON.stringify(this.models[id]);
      delete this.models[id];
      this.unsubscribeCallbacks[id]();
      this.broadcast(new ModelStoreRemoved(id, JSON.parse(modelCopy), noRemoteSync));
    }

    private subscribeUpdateListener(model: OSModel<Model>, noRemoteSync?: boolean): void {
      this.unsubscribeCallbacks[model.id] = model.subscribe((changedArgs: OSModelUpdatedArgs<Model>) => {
        this.broadcast(new ModelStoreUpdated(model.id, changedArgs, noRemoteSync));
      });
  }
}
