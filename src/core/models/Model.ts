import { EventProducer } from 'src/shared/helpers/EventProducer';
import { IEventNotifier } from 'src/types/events';
import { ModelChangeTags } from 'src/types/models';

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
   * The path to the property, from the root Model, that has changed.
   * This can be a dot notation path like:
   * - `mapProperty.new_key`
   * - `complexProperty.simpleProperty`
   * - `complexProperty.mapProperty.new_key`
   */
  path: string;

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
 * When a Model is nested (a property is a Model type or Array of Model types) the child
 * Model is owned and initialized by the parent Model.
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
 * When deserializing a flat Model nothing specific is required. However if the Model
 * is nested the createModelForProperty and/or createListForProperty needs to be implemented
 * to aide in the deserialization process.
 */
type BaseModel = { id?: string };

export class Model<
  U extends object = BaseModel,
  T extends U & BaseModel = U & BaseModel,
> implements IEventNotifier<IModelChangedHandler>
{
  /**
   * A unique identifier for this model.
   */
  get id(): string {
    return this.getProperty('id') as string;
  }

  set id(value: string) {
    this.setProperty('id', value);
  }

  protected data: Map<string, unknown> = new Map();
  private changeNotifier = new EventProducer<IModelChangedHandler>();

  /**
   *
   * @param _parentModel The optional parent model. When specified this model is a child model, any changes
   * to this model will *also* be propagated up to it's parent for notification. When
   * this is specified, must also specify _parentProperty
   * @param _parentProperty The optional parent model property that references this model. When this is
   * specified, must also specify _parentModel
   */
  constructor(
    private _parentModel: Model<BaseModel> | null = null,
    private readonly _parentProperty: string | null = null,
  ) {
    if ((_parentModel == null) !== (_parentProperty == null)) {
      throw new Error(
        'Parent model and parent property must both be set or both be null.',
      );
    }
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
  initializeFromModel(id: string | null, model: Model<BaseModel>): void {
    const newData = new Map<string, unknown>();

    model.data.forEach((value: unknown, key: string) => {
      if (value instanceof Model) {
        const childModel = value as Model<BaseModel>;
        childModel['_parentModel'] = this;
        newData.set(key, childModel);
      } else {
        newData.set(key, value);
      }
    });

    if (id !== null) {
      newData.set('id', id);
    }

    this.data.clear();
    this.data = newData;
  }

  /**
   * Called via initializeFromJson when the property being initialized is a JSON object,
   * indicating the property value should be set to a nested Model. The specific concrete
   * class of Model for this property is determined by the implementor and should depend on
   * the property provided.
   *
   * @param property The property that is to contain the Model created by this method.
   * @param jsonObject The JSON object that the Model will be created/initialized from.
   *
   * @return The created Model, or null if the property should not be set.
   */
  protected createModelForProperty(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _property: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _jsonObject: object,
  ): Model<BaseModel> | null {
    return null;
  }

  /**
   * Called via initializeFromJson when the property being initialized is a JSON array,
   * indicating the property value should be set to an Array. The specific concrete class
   * inside the Array for this property is determined by the implementor and should depend
   * on the property provided.
   *
   * @param property The property that is to contain the Array created by this method.
   * @param jsonArray The JSON array that the Array will be created/initialized from.
   *
   * @return The created Array, or null if the property should not be set.
   */
  protected createListForProperty(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _property: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _jsonArray: unknown[],
  ): unknown[] | null {
    return null;
  }

  setProperty<K extends keyof T>(
    name: string & K,
    value: T[K] | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    const oldValue = this.data.get(name);

    if (oldValue === value && !forceChange) {
      return;
    }

    if (value !== null && value !== undefined) {
      this.data.set(name, value);
    } else if (this.data.has(name)) {
      this.data.delete(name);
    }

    this.notifyChanged(name, name, tag, oldValue, value);
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
    path: string,
    property: string,
    tag: string,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    // if there are any changed listeners for this specific model, notify them.
    const changeArgs: ModelChangedArgs = {
      model: this,
      path,
      property,
      oldValue,
      newValue,
    };
    this.changeNotifier.fire((handler) => handler.onChanged(changeArgs, tag));

    // if there is a parent model, propagate the change up to the parent for it's own processing.
    if (this._parentModel !== null) {
      const parentPath = `${this._parentProperty}.${path}`;
      this._parentModel.notifyChanged(
        parentPath,
        property,
        tag,
        oldValue,
        newValue,
      );
    }
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
}
