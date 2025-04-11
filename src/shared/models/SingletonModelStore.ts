import { Model, ModelChangedArgs } from 'src/core/modelRepo/Model';
import { ModelStore } from 'src/core/modelRepo/ModelStore';
import {
  IModelStoreChangeHandler,
  ISingletonModelStore,
  ISingletonModelStoreChangeHandler,
} from 'src/types/models';
import { EventProducer } from '../helpers/EventProducer';

export class SingletonModelStore<TModel extends Model>
  implements ISingletonModelStore<TModel>, IModelStoreChangeHandler<TModel>
{
  private readonly store: ModelStore<TModel>;
  private readonly changeSubscription = new EventProducer<
    ISingletonModelStoreChangeHandler<TModel>
  >();
  private readonly singletonId = '-singleton-';

  constructor(store: ModelStore<TModel>) {
    this.store = store;
    store.subscribe(this);
  }

  get model(): TModel {
    const model = this.store.get(this.singletonId);
    if (model) return model;

    const createdModel = this.store.create();
    if (!createdModel)
      throw new Error(`Unable to initialize model from store ${this.store}`);

    createdModel.id = this.singletonId;
    this.store.add(createdModel);
    return createdModel;
  }

  replace(model: TModel, tag: string): void {
    const existingModel = this.model;
    existingModel.initializeFromModel(this.singletonId, model);
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

  // These are no-ops by design
  onModelAdded(model: TModel, tag: string): void {
    // No-op: singleton is transparently added
  }

  onModelUpdated(args: ModelChangedArgs, tag: string): void {
    this.changeSubscription.fire((handler) =>
      handler.onModelUpdated(args, tag),
    );
  }

  onModelRemoved(model: TModel, tag: string): void {
    // No-op: singleton is never removed
  }
}
