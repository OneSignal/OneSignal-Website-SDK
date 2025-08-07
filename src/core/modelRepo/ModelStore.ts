// Implements logic similar to Android SDK's ModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/modeling/ModelStore.kt
import {
  type DatabaseModel,
  type IEventNotifier,
  type IModelStore,
  type IModelStoreChangeHandler,
  ModelChangeTags,
  type ModelChangeTagValue,
} from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import type { IndexedDBSchema, ModelNameType } from 'src/shared/database/types';
import { EventProducer } from 'src/shared/helpers/EventProducer';
import type {
  IModelChangedHandler,
  Model,
  ModelChangedArgs,
} from '../models/Model';

/**
 * The abstract implementation of a model store. Implements all but the `create` method,
 * which must be implemented by the concrete class as this abstract implementation is not
 * able to derive and instantiate the concrete model type being stored.
 *
 * Persistence
 * -----------
 * When persistence is enabled for this model store (i.e. a `name` and `_prefs` parameters
 * are provided on initialization) any `Model` that has been added to the model store will
 * be persisted, including any update to that model, when that property update drives a
 * `IModelChangedHandler.onChanged` event. If a model property update does *not* drive
 * a `IModelChangedHandler.onChanged` event but persistence is still desired, there is a
 * `persist` method that can be called at any time.
 *
 * Instantiating this model store with persistence will load any previously persisted models
 * as part of its initialization process.
 */
export abstract class ModelStore<
    TModel extends Model,
    DBModel extends DatabaseModel<TModel> = DatabaseModel<TModel>,
  >
  implements
    IEventNotifier<IModelStoreChangeHandler<TModel>>,
    IModelStore<TModel>,
    IModelChangedHandler
{
  public readonly modelName: ModelNameType;
  private changeSubscription: EventProducer<IModelStoreChangeHandler<TModel>> =
    new EventProducer();
  private models: TModel[] = [];
  private hasLoadedFromCache = false;

  /**
   * @param modelName The persistable name of the model store. If not specified no persisting will occur.
   */
  constructor(modelName: ModelNameType) {
    this.modelName = modelName;
  }

  /**
   * Create a model from JSON data
   */
  abstract create(json?: DBModel | null): TModel | null;

  add(model: TModel, tag: ModelChangeTagValue = ModelChangeTags.NORMAL): void {
    const oldModel = this.models.find((m) => m.modelId === model.modelId);
    if (oldModel) this.removeItem(oldModel, tag);
    this.addItem(model, tag);
  }

  addAt(
    index: number,
    model: TModel,
    tag: ModelChangeTagValue = ModelChangeTags.NORMAL,
  ): void {
    const oldModel = this.models.find((m) => m.modelId === model.modelId);
    if (oldModel) this.removeItem(oldModel, tag);
    this.addItem(model, tag, index);
  }

  /**
   * @returns list of read-only models, cloned for thread safety
   */
  list(): TModel[] {
    return this.models;
  }

  get(id: string): TModel | undefined {
    return this.models.find((m) => m.modelId === id);
  }

  remove(id: string, tag: ModelChangeTagValue = ModelChangeTags.NORMAL): void {
    const model = this.models.find((m) => m.modelId === id);
    if (!model) return;
    this.removeItem(model, tag);
  }

  onChanged(args: ModelChangedArgs, tag: string): void {
    this.persist();
    this.changeSubscription.fire((handler) =>
      handler.onModelUpdated(args, tag),
    );
  }

  replaceAll(
    newModels: TModel[],
    tag: ModelChangeTagValue = ModelChangeTags.NORMAL,
  ) {
    this.clear(tag);

    for (const model of newModels) {
      this.add(model, tag);
    }
  }

  clear(tag: ModelChangeTagValue = ModelChangeTags.NORMAL): void {
    for (const item of this.models) {
      // no longer listen for changes to this model
      item.unsubscribe(this);
      this.changeSubscription.fire((handler) =>
        handler.onModelRemoved(item, tag),
      );
      db.delete(this.modelName, item.modelId);
    }

    this.models = [];
  }

  private addItem(model: TModel, tag: string, index?: number): void {
    if (index !== undefined) {
      this.models.splice(index, 0, model);
    } else {
      this.models.push(model);
    }

    // listen for changes to this model
    model.subscribe(this);
    this.persist();

    this.changeSubscription.fire((handler) => handler.onModelAdded(model, tag));
  }

  private async removeItem(model: TModel, tag: string): Promise<void> {
    const index = this.models.findIndex((m) => m.modelId === model.modelId);
    if (index !== -1) this.models.splice(index, 1);

    // no longer listen for changes to this model
    model.unsubscribe(this);

    await db.delete(this.modelName, model.modelId);
    this.persist();

    this.changeSubscription.fire((handler) =>
      handler.onModelRemoved(model, tag),
    );
  }

  /**
   * When models are loaded from the cache, they are added to the front of existing models.
   * This is primarily to address operations which can enqueue before this method is called.
   */
  protected async load(): Promise<void> {
    if (!this.modelName) return;

    const jsonArray = await db.getAll(this.modelName);

    const shouldRePersist = this.models.length > 0;

    for (let index = jsonArray.length - 1; index >= 0; index--) {
      const newModel = this.create(jsonArray[index] as DBModel);
      if (!newModel) continue;

      this.models.unshift(newModel);
      // listen for changes to this model
      newModel.subscribe(this);
    }

    this.hasLoadedFromCache = true;

    // optimization only: to avoid unnecessary writes
    if (shouldRePersist) {
      this.persist();
    }
  }

  /**
   * Any models added or changed before load is called are not persisted, to avoid overwriting the cache.
   * The time between any changes and loading from cache should be minuscule so lack of persistence is safe.
   * This is primarily to address operations which can enqueue before load() is called.
   */
  async persist(): Promise<void> {
    if (!this.modelName || !this.hasLoadedFromCache) return;

    for (const model of this.models) {
      await db.put(this.modelName, {
        modelId: model.modelId,
        modelName: this.modelName,
        ...model.toJSON(),
      } as IndexedDBSchema[typeof this.modelName]['value']);
    }
  }

  subscribe(handler: IModelStoreChangeHandler<TModel>): void {
    this.changeSubscription.subscribe(handler);
  }

  unsubscribe(handler: IModelStoreChangeHandler<TModel>): void {
    this.changeSubscription.unsubscribe(handler);
  }

  get hasSubscribers(): boolean {
    return this.changeSubscription.hasSubscribers;
  }
}
