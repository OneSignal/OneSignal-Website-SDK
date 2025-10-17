import {
  ModelChangeTags,
  type IEventNotifier,
  type ModelChangeTagValue,
} from 'src/core/types/models';
import { EventProducer } from 'src/shared/helpers/EventProducer';

/**
 * Implement `IModelChangedHandler` and subscribe implementation via `Model.subscribe` to
 * be notified when the `Model` has changed.
 */
export interface IModelChangedHandler<T extends object = object> {
  /**
   * Called when the subscribed model has been changed.
   *
   * @param args Information related to what has changed.
   * @param tag The tag which identifies how/why the model was changed.
   */
  _onChanged(args: ModelChangedArgs<T>, tag: ModelChangeTagValue): void;
}

/**
 * The arguments passed to the IModelChangedHandler when subscribed via Model.subscribe
 */
export interface ModelChangedArgs<T extends object = object> {
  /**
   * The full model in its current state.
   */
  model: Model<T>;

  /**
   * The property that was changed.
   */
  property: string;

  /**
   * The old value of the property, prior to it being changed.
   */
  oldValue: unknown;

  /**
   * The new value of the property, after it has been changed.
   */
  newValue: unknown;
}

// Implements logic similar to Android SDK's Model
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/modeling/Model.kt
/**
 * The base class for a Model. A model is effectively a map of data, each key in the map being
 * a property of the model, each value in the map being the property value. A property can be
 * one of the following values:
 *
 * 1. A simple type.
 * 2. An instance of Model type.
 * 2. An Array of simple types.
 * 3. An Array of Model types.
 *
 * Simple Types
 * ------------
 * Boolean
 * String
 * Number
 *
 * When a structured schema should be enforced this class should be extended, the base class
 * utilizing Properties with getters/setters that wrap getProperty and setProperty calls
 * to the underlying data.
 *
 * When a more dynamic schema is needed, the MapModel class can be used, which bridges a
 * Map and Model.
 *
 * Deserialization
 * ---------------
 * When deserializing a flat Model nothing specific is required.
 */

export class Model<U extends object = object, T extends U & object = U & object>
  implements IEventNotifier<IModelChangedHandler>
{
  /**
   * Legacy Id used as keypath for the IndexedDB tables. A unique identifier for this model.
   */
  public _modelId: string;

  protected _data: Map<string, unknown> = new Map();
  private _changeNotifier = new EventProducer<IModelChangedHandler>();

  constructor() {
    this._modelId = Math.random().toString(36).substring(2);
  }

  /**
   * Initialize this model from a JSON object. Each key-value-pair in the JSON object
   * will be deserialized into this model, recursively if needed.
   *
   * @param object The JSON object to initialize this model from.
   */
  _initializeFromJson(
    modelData: Partial<T> & { modelId?: string; modelName?: string },
  ): void {
    // we manually pass modelName model store persist action
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { modelId, modelName: _, ...rest } = modelData;

    this._data.clear();
    this._data = new Map(Object.entries(rest));

    // TODO: ModelName is a legacy property, could be removed sometime after web refactor launch
    // model name is kept track in the model store, so we don't need to pass it to the model,
    // the model id needs to be passed to the model, so it can stay consistent since reload will generate a new id
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (modelId) {
      this._modelId = modelId;
    }
  }

  /**
   * Initialize this model from another Model. The model provided will be replicated
   * within this model.
   *
   * @param id The id of the model to initialize to.
   * @param model The model to initialize this model from.
   */
  _initializeFromModel(id: string | null, model: Model<U, T>): void {
    const newData = new Map<string, unknown>();

    model._data.forEach((value: unknown, key: string) => {
      newData.set(key, value);
    });

    if (id !== null) {
      this._modelId = id;
    }

    this._data.clear();
    this._data = newData;
  }

  _setProperty<K extends keyof T>(
    name: string & K,
    value: T[K] | undefined,
    tag: ModelChangeTagValue = ModelChangeTags._Normal,
    forceChange = false,
  ): void {
    const oldValue = this._data.get(name);

    if (oldValue === value && !forceChange) {
      return;
    }

    if (value !== undefined) {
      this._data.set(name, value);
    } else if (this._data.has(name)) {
      this._data.delete(name);
    }

    this._notifyChanged(name, tag, oldValue, value);
  }

  /**
   * Determine whether the provided property is currently set in this model.
   *
   * @param name The name of the property to test for.
   *
   * @return True if this model has the provided property, false otherwise.
   */
  _hasProperty(name: string): boolean {
    return this._data.has(name);
  }

  _getProperty<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] {
    const value = this._data.get(name as string) ?? defaultValue;
    return value as T[K];
  }

  private _notifyChanged(
    property: string,
    tag: ModelChangeTagValue,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    // if there are any changed listeners for this specific model, notify them.
    const changeArgs: ModelChangedArgs = {
      model: this,
      property,
      oldValue,
      newValue,
    };
    this._changeNotifier._fire((handler) =>
      handler._onChanged(changeArgs, tag),
    );
  }

  /**
   * Serialize this model to a JSON object, recursively if required.
   *
   * @return The resulting JSON object.
   */
  toJSON(): T {
    return Object.fromEntries(this._data.entries()) as T;
  }

  _subscribe(handler: IModelChangedHandler): void {
    return this._changeNotifier._subscribe(handler);
  }

  _unsubscribe(handler: IModelChangedHandler): void {
    this._changeNotifier._unsubscribe(handler);
  }

  get _hasSubscribers(): boolean {
    return this._changeNotifier._hasSubscribers;
  }

  _mergeData(newData: Partial<T>): void {
    // Merge new data with existing data
    for (const [key, value] of Object.entries(newData)) {
      this._data.set(key, value);
    }
  }
}
