import type { Model, ModelChangedArgs } from 'src/core/models/Model';
import type { IEventNotifier } from './events';

// MODEL STORE
/**
 * A handler interface for subscribing to model change events for a specific model store.
 */
export interface IModelStoreChangeHandler<TModel extends Model> {
  /**
   * Called when a model has been added to the model store.
   *
   * @param model The model that has been added.
   * @param tag The tag which identifies how/why the model was added.
   */
  onModelAdded(model: TModel, tag: string): void;

  /**
   * Called when a model has been updated.
   *
   * @param args The model changed arguments.
   * @param tag The tag which identifies how/why the model was updated.
   */
  onModelUpdated(args: ModelChangedArgs, tag: string): void;

  /**
   * Called when a model has been removed from the model store.
   *
   * @param model The model that has been removed.
   * @param tag The tag which identifies how/why the model was removed.
   */
  onModelRemoved(model: TModel, tag: string): void;
}

export interface IModelStore<TModel extends Model>
  extends IEventNotifier<IModelStoreChangeHandler<TModel>> {
  /**
   * Create a new instance of the model, optionally from a JSON object.
   */
  create(jsonObject?: object): TModel | null;

  /**
   * List the models that are owned by this model store.
   */
  list(): Iterable<TModel>;

  /**
   * Add a model to the store.
   */
  add(model: TModel, tag?: string): void;
  add(index: number, model: TModel, tag?: string): void;

  /**
   * Get a model by id.
   */
  get(id: string): TModel | null;

  /**
   * Remove a model by id.
   */
  remove(id: string, tag?: string): void;

  /**
   * Clear all models.
   */
  clear(tag?: string): void;

  /**
   * Replace all models in the store.
   */
  replaceAll(models: TModel[], tag?: string): void;
}

export const ModelChangeTags = {
  NORMAL: 'NORMAL',
  NO_PROPOGATE: 'NO_PROPOGATE',
  HYDRATE: 'HYDRATE',
} as const;
