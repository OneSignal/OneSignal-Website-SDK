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
import type { IDBStoreName, IndexedDBSchema } from 'src/shared/database/types';
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
  public readonly _modelName: IDBStoreName;
  private _changeSubscription: EventProducer<IModelStoreChangeHandler<TModel>> =
    new EventProducer();
  private _models: TModel[] = [];
  private _hasLoadedFromCache = false;

  /**
   * @param modelName The persistable name of the model store. If not specified no persisting will occur.
   */
  constructor(modelName: IDBStoreName) {
    this._modelName = modelName;
  }

  /**
   * Create a model from JSON data
   */
  abstract _create(json?: DBModel | null): TModel | null;

  _add(
    model: TModel,
    tag: ModelChangeTagValue = ModelChangeTags._Normal,
  ): void {
    const oldModel = this._models.find((m) => m._modelId === model._modelId);
    if (oldModel) this._removeItem(oldModel, tag);
    this._addItem(model, tag);
  }

  _addAt(
    index: number,
    model: TModel,
    tag: ModelChangeTagValue = ModelChangeTags._Normal,
  ): void {
    const oldModel = this._models.find((m) => m._modelId === model._modelId);
    if (oldModel) this._removeItem(oldModel, tag);
    this._addItem(model, tag, index);
  }

  /**
   * @returns list of read-only models, cloned for thread safety
   */
  _list(): TModel[] {
    return this._models;
  }

  _get(id: string): TModel | undefined {
    return this._models.find((m) => m._modelId === id);
  }

  _remove(
    id: string,
    tag: ModelChangeTagValue = ModelChangeTags._Normal,
  ): void {
    const model = this._models.find((m) => m._modelId === id);
    if (!model) return;
    this._removeItem(model, tag);
  }

  _onChanged(args: ModelChangedArgs, tag: ModelChangeTagValue): void {
    this._persist();
    this._changeSubscription._fire((handler) =>
      handler._onModelUpdated(args, tag),
    );
  }

  _replaceAll(
    newModels: TModel[],
    tag: ModelChangeTagValue = ModelChangeTags._Normal,
  ) {
    this._clear(tag);

    for (const model of newModels) {
      this._add(model, tag);
    }
  }

  _clear(tag: ModelChangeTagValue = ModelChangeTags._Normal): void {
    for (const item of this._models) {
      // no longer listen for changes to this model
      item._unsubscribe(this);
      this._changeSubscription._fire((handler) =>
        handler._onModelRemoved(item, tag),
      );
      db.delete(this._modelName, item._modelId);
    }

    this._models = [];
  }

  private _addItem(
    model: TModel,
    tag: ModelChangeTagValue,
    index?: number,
  ): void {
    if (index !== undefined) {
      this._models.splice(index, 0, model);
    } else {
      this._models.push(model);
    }

    // listen for changes to this model
    model._subscribe(this);
    this._persist();

    this._changeSubscription._fire((handler) =>
      handler._onModelAdded(model, tag),
    );
  }

  private async _removeItem(
    model: TModel,
    tag: ModelChangeTagValue,
  ): Promise<void> {
    const index = this._models.findIndex((m) => m._modelId === model._modelId);
    if (index !== -1) this._models.splice(index, 1);

    // no longer listen for changes to this model
    model._unsubscribe(this);

    await db.delete(this._modelName, model._modelId);
    this._persist();

    this._changeSubscription._fire((handler) =>
      handler._onModelRemoved(model, tag),
    );
  }

  /**
   * When models are loaded from the cache, they are added to the front of existing models.
   * This is primarily to address operations which can enqueue before this method is called.
   */
  protected async _load(): Promise<void> {
    if (!this._modelName) return;

    const jsonArray = (await db.getAll(
      this._modelName,
    )) as unknown as DBModel[];

    const shouldRePersist = this._models.length > 0;

    for (let index = jsonArray.length - 1; index >= 0; index--) {
      const newModel = this._create(jsonArray[index]);
      if (!newModel) continue;

      this._models.unshift(newModel);
      // listen for changes to this model
      newModel._subscribe(this);
    }

    this._hasLoadedFromCache = true;

    // optimization only: to avoid unnecessary writes
    if (shouldRePersist) {
      this._persist();
    }
  }

  /**
   * Any models added or changed before load is called are not persisted, to avoid overwriting the cache.
   * The time between any changes and loading from cache should be minuscule so lack of persistence is safe.
   * This is primarily to address operations which can enqueue before load() is called.
   */
  async _persist(): Promise<void> {
    if (!this._modelName || !this._hasLoadedFromCache) return;

    for (const model of this._models) {
      await db.put(this._modelName, {
        modelId: model._modelId,
        modelName: this._modelName, // TODO: ModelName is a legacy property, could be removed sometime after web refactor launch
        ...model.toJSON(),
      } as IndexedDBSchema[typeof this._modelName]['value']);
    }
  }

  _subscribe(handler: IModelStoreChangeHandler<TModel>): void {
    this._changeSubscription._subscribe(handler);
  }

  _unsubscribe(handler: IModelStoreChangeHandler<TModel>): void {
    this._changeSubscription._unsubscribe(handler);
  }

  get _hasSubscribers(): boolean {
    return this._changeSubscription._hasSubscribers;
  }
}
