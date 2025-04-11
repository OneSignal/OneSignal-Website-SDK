import { EventProducer } from 'src/shared/helpers/EventProducer';
import { IEventNotifier } from 'src/types/events';
import { ModelChangeTags } from 'src/types/models';

// MODEL CHANGED
/**
 * Implement `IModelChangedHandler` and subscribe implementation via `Model.subscribe` to
 * be notified when the `Model` has changed.
 */
export interface IModelChangedHandler {
  /**
   * Called when the subscribed model has been changed.
   *
   * @param args Information related to what has changed.
   * @param tag The tag which identifies how/why the model was changed.
   */
  onChanged(args: ModelChangedArgs, tag: string): void;
}

/**
 * The arguments passed to the IModelChangedHandler when subscribed via Model.subscribe
 */
export interface ModelChangedArgs {
  /**
   * The full model in its current state.
   */
  model: Model;

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
export class Model implements IEventNotifier<IModelChangedHandler> {
  /**
   * A unique identifier for this model.
   */
  get id(): string {
    return this.getStringProperty('id');
  }

  set id(value: string) {
    this.setStringProperty('id', value);
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
    private _parentModel: Model | null = null,
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
  initializeFromJson(object: object): void {
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
  initializeFromModel(id: string | null, model: Model): void {
    const newData = new Map<string, unknown>();

    model.data.forEach((value: unknown, key: string) => {
      if (value instanceof Model) {
        const childModel = value as Model;
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
    property: string,
    jsonObject: any,
  ): Model | null {
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
    property: string,
    jsonArray: any[],
  ): any[] | null {
    return null;
  }

  setEnumProperty<T extends string>(
    name: string,
    value: T,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptEnumProperty(name, value, tag, forceChange);
  }

  setMapModelProperty<T>(
    name: string,
    value: Map<string, T>,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptMapModelProperty(name, value, tag, forceChange);
  }

  setListProperty<T>(
    name: string,
    value: T[],
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptListProperty(name, value, tag, forceChange);
  }

  setStringProperty(
    name: string,
    value: string,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptStringProperty(name, value, tag, forceChange);
  }

  setBooleanProperty(
    name: string,
    value: boolean,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptBooleanProperty(name, value, tag, forceChange);
  }

  setNumberProperty(
    name: string,
    value: number,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptNumberProperty(name, value, tag, forceChange);
  }

  setAnyProperty(
    name: string,
    value: any,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptEnumProperty<T extends string>(
    name: string,
    value: T | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptMapModelProperty<T>(
    name: string,
    value: Map<string, T> | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptListProperty<T>(
    name: string,
    value: T[] | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptStringProperty(
    name: string,
    value: string | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptBooleanProperty(
    name: string,
    value: boolean | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptNumberProperty(
    name: string,
    value: number | null,
    tag: string = ModelChangeTags.NORMAL,
    forceChange = false,
  ): void {
    this.setOptAnyProperty(name, value, tag, forceChange);
  }

  setOptAnyProperty(
    name: string,
    value: any,
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

  protected getEnumProperty<T extends string>(name: string): T {
    const value = this.getOptEnumProperty<T>(name);
    if (value === null) {
      throw new Error(`Property ${name} is null`);
    }
    return value;
  }

  protected getMapModelProperty<T>(
    name: string,
    create?: () => Map<string, T>,
  ): Map<string, T> {
    const value = this.getOptMapModelProperty<T>(name, create);
    if (value === null) {
      throw new Error(`Property ${name} is null`);
    }
    return value;
  }

  protected getListProperty<T>(name: string, create?: () => T[]): T[] {
    const value = this.getOptListProperty<T>(name, create);
    if (value === null) {
      throw new Error(`Property ${name} is null`);
    }
    return value;
  }

  protected getStringProperty(name: string, create?: () => string): string {
    const value = this.getOptStringProperty(name, create);
    if (value === null) {
      throw new Error(`Property ${name} is null`);
    }
    return value;
  }

  protected getBooleanProperty(name: string, create?: () => boolean): boolean {
    const value = this.getOptBooleanProperty(name, create);
    if (value === null) {
      throw new Error(`Property ${name} is null`);
    }
    return value;
  }

  protected getNumberProperty(name: string, create?: () => number): number {
    const value = this.getOptNumberProperty(name, create);
    if (value === null) {
      throw new Error(`Property ${name} is null`);
    }
    return value;
  }

  protected getAnyProperty(name: string, create?: () => any): any {
    const value = this.getOptAnyProperty(name, create);
    if (value === null || value === undefined) {
      throw new Error(`Property ${name} is null or undefined`);
    }
    return value;
  }

  protected getOptEnumProperty<T extends string>(name: string): T | null {
    const value = this.getOptAnyProperty(name);
    if (value === null || value === undefined) {
      return null;
    }
    return value as T;
  }

  protected getOptMapModelProperty<T>(
    name: string,
    create?: () => Map<string, T> | null,
  ): Map<string, T> | null {
    return this.getOptAnyProperty(name, create) as Map<string, T> | null;
  }

  protected getOptListProperty<T>(
    name: string,
    create?: () => T[] | null,
  ): T[] | null {
    return this.getOptAnyProperty(name, create) as T[] | null;
  }

  protected getOptStringProperty(
    name: string,
    create?: () => string | null,
  ): string | null {
    const value = this.getOptAnyProperty(name, create);
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }

  protected getOptBooleanProperty(
    name: string,
    create?: () => boolean | null,
  ): boolean | null {
    const value = this.getOptAnyProperty(name, create);
    if (value === null || value === undefined) {
      return null;
    }
    return Boolean(value);
  }

  protected getOptNumberProperty(
    name: string,
    create?: () => number | null,
  ): number | null {
    const value = this.getOptAnyProperty(name, create);
    if (value === null || value === undefined) {
      return null;
    }
    return Number(value);
  }

  protected getOptAnyProperty(name: string, create?: () => unknown): unknown {
    if (this.data.has(name) || !create) {
      return this.data.get(name);
    } else {
      const defaultValue = create();
      this.data.set(name, defaultValue);
      return defaultValue;
    }
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
  toJSON(): object {
    return Object.fromEntries(this.data.entries());
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
