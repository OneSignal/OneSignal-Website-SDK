import { ModelStore } from 'src/core/modelRepo/ModelStore';
import { Model, ModelChangedArgs } from 'src/core/models/Model';
import {
  IModelStoreChangeHandler,
  ISingletonModelStore,
  ISingletonModelStoreChangeHandler,
} from 'src/core/types/models';
import { EventProducer } from '../../shared/helpers/EventProducer';

// Implements logic similar to Android SDK's SingletonModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/modeling/SingletonModelStore.kt
export class SingletonModelStore<TModel extends Model>
  implements ISingletonModelStore<TModel>, IModelStoreChangeHandler<TModel>
{
  private readonly store: ModelStore<TModel>;
  private readonly changeSubscription = new EventProducer<
    ISingletonModelStoreChangeHandler<TModel>
  >();

  constructor(store: ModelStore<TModel>) {
    this.store = store;
    store.subscribe(this);
  }

  get model(): TModel {
    const model = this.store.list()[0];
    if (model) return model;

    const createdModel = this.store.create();
    if (!createdModel)
      throw new Error(`Unable to initialize model from store ${this.store}`);

    this.store.add(createdModel);
    return createdModel;
  }

  replace(model: TModel, tag: string): void {
    const existingModel = this.model;
    existingModel.initializeFromModel(existingModel.modelId, model);
    this.store.persist();
    this.changeSubscription.fire((handler) =>
      handler.onModelReplaced(existingModel, tag),
    );
  }

  subscribe(handler: ISingletonModelStoreChangeHandler<TModel>): void {
    this.changeSubscription.subscribe(handler);
  }

  unsubscribe(handler: ISingletonModelStoreChangeHandler<TModel>): void {
    this.changeSubscription.unsubscribe(handler);
  }

  get hasSubscribers(): boolean {
    return this.changeSubscription.hasSubscribers;
  }

  /**
   * @param {TModel} model
   * @param {string} tag
   */
  onModelAdded(): void {
    // No-op: singleton is transparently added
  }

  onModelUpdated(args: ModelChangedArgs, tag: string): void {
    this.changeSubscription.fire((handler) =>
      handler.onModelUpdated(args, tag),
    );
  }

  /**
   * @param {TModel} model
   * @param {string} tag
   */
  onModelRemoved(): void {
    // No-op: singleton is never removed
  }
}
