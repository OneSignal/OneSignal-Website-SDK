import { OSModelUpdatedArgs } from "./OSModelUpdatedArgs";
import Subscribable from "../Subscribable";
import EncodedModel from "../caching/EncodedModel";
import { StringKeys } from "../models/StringKeys";
import { ModelName } from "../models/SupportedModels";

export class OSModel<Model> extends Subscribable<OSModelUpdatedArgs<Model>> {
  public id: string;
  public data?: Model;

  constructor(public modelName: ModelName, id?: string, data?: Model) {
    super();
    this.id = id ?? Math.random().toString(36).substring(2);
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

    this.broadcast(new OSModelUpdatedArgs(this, property, oldValue, newValue));
  }

  /**
   * Updates the entire model data.
   * To be called when updating the data with a remote sync.
   */
  public hydrate(data: Model): void {
    this.data = data;
  }


  public encode(): EncodedModel {
    const modelId = this.id as string;
    const modelName = this.modelName;
    return { modelId, modelName, ...this.data };
  }

  static decode<Model>(encodedModel: EncodedModel): OSModel<Model> {
    const { modelId: id, modelName, ...data } = encodedModel;
    return new OSModel<Model>(modelName as ModelName, id, data as unknown as Model);
  }
}
