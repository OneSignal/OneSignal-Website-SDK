import { ModelStore } from 'src/core/modelRepo/ModelStore';
import { Model, type ModelChangedArgs } from 'src/core/models/Model';
import {
  type IModelStoreChangeHandler,
  type ISingletonModelStore,
  type ISingletonModelStoreChangeHandler,
  type ModelChangeTagValue,
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
    store._subscribe(this);
  }

  get _model(): TModel {
    const model = this.store._list()[0];
    if (model) return model;

    const createdModel = this.store._create();
    if (!createdModel)
      throw new Error(`Unable to initialize model from store ${this.store}`);

    this.store._add(createdModel);
    return createdModel;
  }

  _replace(model: TModel, tag?: ModelChangeTagValue): void {
    const existingModel = this._model;
    existingModel._initializeFromModel(existingModel._modelId, model);
    this.store._persist();
    this.changeSubscription._fire((handler) =>
      handler._onModelReplaced(existingModel, tag),
    );
  }

  _subscribe(handler: ISingletonModelStoreChangeHandler<TModel>): void {
    this.changeSubscription._subscribe(handler);
  }

  _unsubscribe(handler: ISingletonModelStoreChangeHandler<TModel>): void {
    this.changeSubscription._unsubscribe(handler);
  }

  get _hasSubscribers(): boolean {
    return this.changeSubscription._hasSubscribers;
  }

  /**
   * @param {TModel} model
   * @param {ModelChangeTagValue)} tag
   */
  _onModelAdded(): void {
    // No-op: singleton is transparently added
  }

  _onModelUpdated(args: ModelChangedArgs, tag: ModelChangeTagValue): void {
    this.changeSubscription._fire((handler) =>
      handler._onModelUpdated(args, tag),
    );
  }

  /**
   * @param {TModel} model
   * @param {ModelChangeTagValue} tag
   */
  _onModelRemoved(): void {
    // No-op: singleton is never removed
  }
}
