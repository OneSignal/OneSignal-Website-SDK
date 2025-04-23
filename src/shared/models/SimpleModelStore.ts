import { ModelStore } from 'src/core/modelRepo/ModelStore';
import { Model } from 'src/core/models/Model';
import { ModelNameType } from 'src/core/types/models';

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

  override create(jsonObject?: object): TModel {
    const model = this._create();
    if (jsonObject != null) {
      model.initializeFromJson(jsonObject);
    }
    return model;
  }
}
