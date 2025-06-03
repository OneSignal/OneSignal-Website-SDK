import { ModelStore } from 'src/core/modelRepo/ModelStore';
import { Model } from 'src/core/models/Model';
import { DatabaseModel, ModelNameType } from 'src/core/types/models';

// Implements logic similar to Android SDK's SimpleModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/modeling/SimpleModelStore.kt
/**
 * A simple model store is a concrete implementation of the ModelStore,
 * which provides a basic create() method using the passed-in factory.
 */
export class SimpleModelStore<TModel extends Model> extends ModelStore<TModel> {
  private readonly _create: () => TModel;

  /**
   * @param _create A factory function used to instantiate a new model instance.
   * @param modelName Name for persistence.
   */
  constructor(_create: () => TModel, modelName: ModelNameType) {
    super(modelName);
    this._create = _create;
    this.load(); // Automatically load on construction
  }

  override create(modelData?: DatabaseModel<TModel>): TModel {
    const model = this._create();
    if (modelData != null) {
      // model name is kept track in the model store, so we don't need to pass it to the model,
      // the model id needs to be passed to the model, so it can stay consistent since reload will generate a new id
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { modelId, modelName: _, ...rest } = modelData;
      model.initializeFromJson(rest);
      if (modelId) {
        model.modelId = modelId;
      }
    }
    return model;
  }
}
