import { ModelStore } from 'src/core/modelRepo/ModelStore';
import { Model } from 'src/core/models/Model';
import type { DatabaseModel } from 'src/core/types/models';
import type { ModelNameType } from 'src/shared/database/types';

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
      model.initializeFromJson(modelData);
    }
    return model;
  }
}
