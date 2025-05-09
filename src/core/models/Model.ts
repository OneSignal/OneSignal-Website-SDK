import { IEventNotifier } from 'src/core/types/events';
import { ModelChangeTags } from 'src/core/types/models';
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
  onChanged(args: ModelChangedArgs<T>, tag: string): void;
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
  public modelId: string;

  protected data: Map<string, unknown> = new Map();
  private changeNotifier = new EventProducer<IModelChangedHandler>();

  constructor() {
    this.modelId = Math.random().toString(36).substring(2);
  }

  /**
   * Initialize this model from a JSON object. Each key-value-pair in the JSON object
   * will be deserialized into this model, recursively if needed.
   *
   * @param object The JSON object to initialize this model from.
   */
  initializeFromJson(object: Partial<T>): void {
    this.data.clear();
    this.data = new Map(Object.entries(object));
  }

  /**
   * Initialize this model from another Model. The model provided will be replicated
   * within this model.
   *
   * @param id The id of the model to initialize to.
   * @param model The model to initialize this model from.
   */
  initializeFromModel(id: string | null, model: Model<U, T>): void {
    const newData = new Map<string, unknown>();

    model.data.forEach((value: unknown, key: string) => {
      newData.set(key, value);
    });

    if (id !== null) {
      this.modelId = id;
    }

    this.data.clear();
    this.data = newData;
  }

  setProperty<K extends keyof T>(
    name: string & K,
    value: T[K] | undefined,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    const oldValue = this.data.get(name);

    if (oldValue === value && !forceChange) {
      return;
    }

    if (value !== undefined) {
      this.data.set(name, value);
    } else if (this.data.has(name)) {
      this.data.delete(name);
    }

    this.notifyChanged(name, tag, oldValue, value);
  }

  /**
   * Determine whether the provided property is currently set in this model.
   *
   * @param name The name of the property to test for.
   *
   * @return True if this model has the provided property, false otherwise.
   */
  hasProperty(name: string): boolean {
    return this.data.has(name);
  }

  getProperty<K extends keyof T>(name: K, defaultValue?: T[K]): T[K] {
    const value = this.data.get(name as string) ?? defaultValue;
    return value as T[K];
  }

  private notifyChanged(
    property: string,
    tag: string,
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
    this.changeNotifier.fire((handler) => handler.onChanged(changeArgs, tag));
  }

  /**
   * Serialize this model to a JSON object, recursively if required.
   *
   * @return The resulting JSON object.
   */
  toJSON(): T {
    return Object.fromEntries(this.data.entries()) as T;
  }

  subscribe(handler: IModelChangedHandler): void {
    return this.changeNotifier.subscribe(handler);
  }

  unsubscribe(handler: IModelChangedHandler): void {
    this.changeNotifier.unsubscribe(handler);
  }

  get hasSubscribers(): boolean {
    return this.changeNotifier.hasSubscribers;
  }

  mergeData(newData: Partial<T>): void {
    // Merge new data with existing data
    for (const [key, value] of Object.entries(newData)) {
      this.data.set(key, value);
    }
  }
}
