import type { Model, ModelChangedArgs } from 'src/core/models/Model';
import type { IEventNotifier } from './events';

export const ModelName = {
  Operations: 'operations',
  Identity: 'identity',
  Properties: 'properties',
  Subscriptions: 'subscriptions',
} as const;
export type ModelNameType = (typeof ModelName)[keyof typeof ModelName];

export const ModelChangeTags = {
  /**
   * A change was performed through normal means.
   */
  NORMAL: 'NORMAL',

  /**
   * A change was performed that should *not* be propogated to the backend.
   */
  NO_PROPOGATE: 'NO_PROPOGATE',

  /**
   * A change was performed through the backend hydrating the model.
   */
  HYDRATE: 'HYDRATE',
} as const;

export type ModelChangeTagValue =
  (typeof ModelChangeTags)[keyof typeof ModelChangeTags];

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
  addAt(index: number, model: TModel, tag?: string): void;

  /**
   * Get a model by id.
   */
  get(id: string): TModel | undefined;

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

// SINGLETON MODEL STORE
/**
 * A handler interface for ISingletonModelStore.subscribe.
 * Implement this interface to subscribe to model change events for a specific model store.
 */
export interface ISingletonModelStoreChangeHandler<TModel extends Model> {
  /**
   * Called when the model has been replaced.
   *
   * @param model - The new model.
   * @param tag - The tag which identifies how/why the model was replaced.
   */
  onModelReplaced(model: TModel, tag?: string): void;

  /**
   * Called when a property within the model has been updated.
   * This wraps IModelChangedHandler.onChanged so store users don't need to subscribe directly to the model.
   *
   * @param args - The model change arguments.
   * @param tag - The tag which identifies how/why the model was updated.
   */
  onModelUpdated(args: ModelChangedArgs, tag?: string): void;
}

export interface ISingletonModelStore<TModel extends Model>
  extends IEventNotifier<ISingletonModelStoreChangeHandler<TModel>> {
  /**
   * The model managed by this singleton model store.
   */
  readonly model: TModel;

  /**
   * Replace the existing model with the new model provided.
   *
   * @param model - A model that contains all the data for the new effective model.
   * @param tag - A tag identifying how/why the model is being replaced.
   */
  replace(model: TModel, tag?: string): void;
}
