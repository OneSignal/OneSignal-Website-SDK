import type { Model, ModelChangedArgs } from 'src/core/models/Model';

export const ModelChangeTags = {
  /**
   * A change was performed through normal means.
   */
  _Normal: 0,

  /**
   * A change was performed that should *not* be propogated to the backend.
   */
  _NoPropogate: 1,

  /**
   * A change was performed through the backend hydrating the model.
   */
  _Hydrate: 2,
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
  _onModelAdded(model: TModel, tag: ModelChangeTagValue): void;

  /**
   * Called when a model has been updated.
   *
   * @param args The model changed arguments.
   * @param tag The tag which identifies how/why the model was updated.
   */
  _onModelUpdated(args: ModelChangedArgs, tag: ModelChangeTagValue): void;

  /**
   * Called when a model has been removed from the model store.
   *
   * @param model The model that has been removed.
   * @param tag The tag which identifies how/why the model was removed.
   */
  _onModelRemoved(model: TModel, tag: ModelChangeTagValue): void;
}

export type DatabaseModel<TModel extends Model> = ReturnType<
  TModel['toJSON']
> & {
  modelId: string;
  modelName: string;
};

export interface IModelStore<
  TModel extends Model,
  DBModel extends DatabaseModel<TModel> = DatabaseModel<TModel>,
> extends IEventNotifier<IModelStoreChangeHandler<TModel>> {
  /**
   * Create a new instance of the model, optionally from a JSON object.
   */
  _create(jsonObject?: DBModel | null): TModel | null;

  /**
   * List the models that are owned by this model store.
   */
  _list(): Iterable<TModel>;

  /**
   * Add a model to the store.
   */
  _add(model: TModel, tag?: ModelChangeTagValue): void;
  _addAt(index: number, model: TModel, tag?: ModelChangeTagValue): void;

  /**
   * Get a model by id.
   */
  _get(id: string): TModel | undefined;

  /**
   * Remove a model by id.
   */
  _remove(id: string, tag?: ModelChangeTagValue): void;

  /**
   * Clear all models.
   */
  _clear(tag?: ModelChangeTagValue): void;

  /**
   * Replace all models in the store.
   */
  _replaceAll(models: TModel[], tag?: ModelChangeTagValue): void;
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
  _onModelReplaced(model: TModel, tag?: ModelChangeTagValue): void;

  /**
   * Called when a property within the model has been updated.
   * This wraps IModelChangedHandler.onChanged so store users don't need to subscribe directly to the model.
   *
   * @param args - The model change arguments.
   * @param tag - The tag which identifies how/why the model was updated.
   */
  _onModelUpdated(args: ModelChangedArgs, tag?: ModelChangeTagValue): void;
}

export interface ISingletonModelStore<TModel extends Model>
  extends IEventNotifier<ISingletonModelStoreChangeHandler<TModel>> {
  /**
   * The model managed by this singleton model store.
   */
  readonly _model: TModel;

  /**
   * Replace the existing model with the new model provided.
   *
   * @param model - A model that contains all the data for the new effective model.
   * @param tag - A tag identifying how/why the model is being replaced.
   */
  _replace(model: TModel, tag?: ModelChangeTagValue): void;
}

/**
 * A generic interface which indicates the implementer has the ability to notify events through the
 * generic THandler interface specified. When implemented, any outside component may subscribe
 * to the events being notified. When an event is to be raised, the implementor
 * will call a method within THandler, the method(s) defined therein are entirely dependent on
 * the implementor/definition.
 *
 * Unlike ICallbackNotifier, there can be one zero or more event subscribers at any given time.
 *
 * @template THandler The type that the implementor is expecting to raise events to.
 */
export interface IEventNotifier<THandler> {
  /**
   * Whether there are currently any subscribers.
   */
  _hasSubscribers: boolean;

  /**
   * Subscribe to listen for events.
   *
   * @param handler The handler that will be called when the event(s) occur.
   */
  _subscribe(handler: THandler): void;

  /**
   * Unsubscribe to no longer listen for events.
   *
   * @param handler The handler that was previous registered via subscribe.
   */
  _unsubscribe(handler: THandler): void;
}
