// Implements logic similar to Android SDK's ModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/modeling/ModelStore.kt
import { EventProducer } from 'src/shared/helpers/EventProducer';
import Log from 'src/shared/libraries/Log';
import type { IEventNotifier } from 'src/types/events';
import type { IModelStore, IModelStoreChangeHandler } from 'src/types/models';
import type { IPreferencesService } from 'src/types/preferences';
import type {
  IModelChangedHandler,
  Model,
  ModelChangedArgs,
} from '../models/Model';
const STORE = 'OneSignal_ModelStore';

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
export abstract class ModelStore<TModel extends Model>
  implements
    IEventNotifier<IModelStoreChangeHandler<TModel>>,
    IModelStore<TModel>,
    IModelChangedHandler
{
  private changeSubscription: EventProducer<IModelStoreChangeHandler<TModel>> =
    new EventProducer();
  private models: TModel[] = [];
  private hasLoadedFromCache = false;

  /**
   * @param name The persistable name of the model store. If not specified no persisting will occur.
   * @param _prefs Preferences service for persistence
   */
  constructor(
    public readonly name?: string,
    private _prefs?: IPreferencesService,
  ) {}

  /**
   * Create a model from JSON data
   */
  abstract create(json?: object | null): TModel | null;

  add(model: TModel, tag = ModelChangeTags.NORMAL): void {
    const oldModel = this.models.find((m) => m.id === model.id);
    if (oldModel) this.removeItem(oldModel, tag);
    this.addItem(model, tag);
  }

  addAt(index: number, model: TModel, tag = ModelChangeTags.NORMAL): void {
    const oldModel = this.models.find((m) => m.id === model.id);
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
    return this.models.find((m) => m.id === id);
  }

  remove(id: string, tag: string): void {
    const model = this.models.find((m) => m.id === id);
    if (!model) return;
    this.removeItem(model, tag);
  }

  onChanged(args: ModelChangedArgs, tag: string): void {
    this.persist();
    this.changeSubscription.fire((handler) =>
      handler.onModelUpdated(args, tag),
    );
  }

  replaceAll(newModels: TModel[], tag: string): void {
    this.clear(tag);
    for (const model of newModels) {
      this.add(model, tag);
    }
  }

  clear(tag: string): void {
    this.persist();

    for (const item of this.models) {
      // no longer listen for changes to this model
      item.unsubscribe(this);
      this.changeSubscription.fire((handler) =>
        handler.onModelRemoved(item, tag),
      );
    }
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

  private removeItem(model: TModel, tag: string): void {
    this.models = this.models.filter((m) => m !== model);

    // no longer listen for changes to this model
    model.unsubscribe(this);

    this.persist();

    this.changeSubscription.fire((handler) =>
      handler.onModelRemoved(model, tag),
    );
  }

  /**
   * When models are loaded from the cache, they are added to the front of existing models.
   * This is primarily to address operations which can enqueue before this method is called.
   */
  protected load(): void {
    if (!this.name || !this._prefs) return;

    const str = this._prefs.getValue<string>(STORE, this.name, '[]');

    const jsonArray = JSON.parse(str);
    const shouldRePersist = this.models.length > 0;

    for (let index = jsonArray.length - 1; index >= 0; index--) {
      const newModel = this.create(jsonArray[index]);
      if (!newModel) continue;

      const hasExisting = this.models.some((m) => m.id === newModel.id);
      if (hasExisting) {
        Log.debug(
          `ModelStore<${this.name}>: load - operation.id: ${newModel.id} already exists in the store.`,
        );
        continue;
      }

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
  persist(): void {
    if (!this.name || !this._prefs || !this.hasLoadedFromCache) return;

    const jsonArray: unknown[] = [];
    for (const model of this.models) {
      jsonArray.push(model.toJSON());
    }

    this._prefs.setValue<string>(STORE, this.name, JSON.stringify(jsonArray));
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
