import { OSModelUpdatedArgs } from "./OSModelUpdatedArgs";
import Subscribable from "../Subscribable";
import EncodedModel from "../caching/EncodedModel";
import { StringKeys } from "../models/StringKeys";
import { ModelName } from "../models/SupportedModels";
import { ModelStoreChange, ModelStoreHydrated, ModelStoreUpdated } from "../models/ModelStoreChange";

export class OSModel<Model> extends Subscribable<ModelStoreChange<Model>> {
  public modelId: string;
  public data?: Model;

  constructor(public modelName: ModelName, modelId?: string, data?: Model) {
    super();
    this.modelId = modelId ?? Math.random().toString(36).substring(2);
    this.modelName = modelName;
    this.data = data;
  }

  /**
   * We use this method to update the model data.
   * Results in a broadcasted update event.
   */
  public set(property: StringKeys<Model>, newValue: any): void {
    let oldValue;

    if (this.data) {
      oldValue = this.data[property];
      this.data[property] = newValue;
    }

    const change = new ModelStoreUpdated(this.modelId, new OSModelUpdatedArgs(this, property, oldValue, newValue));
    this.broadcast(change);
  }

  /**
   * Updates the entire model data.
   * To be called when updating the data with a remote sync.
   */
  public hydrate(data: Model): void {
    this.data = data;
    this.broadcast(new ModelStoreHydrated(this.modelId, this));
  }


  public encode(): EncodedModel {
    const modelId = this.modelId as string;
    const modelName = this.modelName;
    return { modelId, modelName, ...this.data };
  }

  static decode<Model>(encodedModel: EncodedModel): OSModel<Model> {
    const { modelId: id, modelName, ...data } = encodedModel;
    return new OSModel<Model>(modelName as ModelName, id, data as unknown as Model);
  }
}
