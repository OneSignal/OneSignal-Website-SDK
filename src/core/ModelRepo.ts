import {
  Delta,
  IdentityModel,
  Model,
  ObservableSlimChange,
  UserProperties,
  SubscriptionsModel
} from "./types";
import ObservableSlim from 'observable-slim';
import Subscribable from "./utils/Subscribable";
import equal from 'fast-deep-equal/es6';
import ModelCache from "./caches/ModelCache";
import { AppConfig } from "../shared/models/AppConfig";
import Utils from "../shared/context/Utils";
import DEFAULT_MODELS from "./utils/DefaultModelObjects";

interface StringIndexable {
  [key: string]: any;
}

export default class ModelRepo extends Subscribable<Delta> {
  // these properties are publically accessible but should not be mutated directly (use set)
  public identity?: IdentityModel;
  public properties?: UserProperties;
  public subscriptions?: SubscriptionsModel[];
  public config?: AppConfig;

  private _identity?: IdentityModel;
  private _properties?: UserProperties;
  private _subscriptions?: SubscriptionsModel[];
  private _config?: AppConfig;

  constructor() {
    super();
  }

  /**
   * Loads models from cache
   * IMPORTANT: Must be called after instantiation to complete setup process
   *  - creates Proxy observers assigned to public top-level class model properties
   *  - observers will trigger writes to cache immediately upon object mutation (see `createObserver`)
   * @returns Promise<AppConfig>
   */
  public async initialize(): Promise<void> {
    // ES5 limitation: object properties must be known at creation time
    // for ObservableSlim to work as expected
    this._identity = Utils.getValueOrDefault(
      (await ModelCache.get(Model.Identity)), DEFAULT_MODELS.identity);
    this._properties = Utils.getValueOrDefault(
      (await ModelCache.get(Model.Properties)), DEFAULT_MODELS.properties);
    this._subscriptions = Utils.getValueOrDefault(
      (await ModelCache.get(Model.Subscriptions)), DEFAULT_MODELS.subscriptions);
    this._config = Utils.getValueOrDefault(
      (await this.getCachedConfig()), DEFAULT_MODELS.config);

    this.identity = this.createObserver(Model.Identity, this._identity);
    this.properties = this.createObserver(Model.Properties, this._properties);
    this.subscriptions = this.createObserver(Model.Subscriptions, this._subscriptions);
    this.config = this.createObserver(Model.Config, this._config);
  }

  public async getCachedConfig(): Promise<AppConfig> {
    return await ModelCache.get(Model.Config);
  }

  /**
   * Uses ObservableSlim lib to detect object changes
   * https://github.com/ElliotNB/observable-slim
   * Observer triggers a write to cache
   * @param  {object} target - the object to observe
   * @param  {Model} model - the model the change corresponds to
   * @returns object
   */
  private createObserver<T>(model: Model, target?: object): T {
    /**
     * @param {object} target - the object we want to observe
     * @param {boolean} delay - if true, observed changes are batched every 10ms
     * @param {function} observer - the observer callback
     */
    return ObservableSlim.create(target, true, async (changes: ObservableSlimChange[]) => {
      changes.forEach(change => {
        if (equal(change.previousValue, change.newValue)) {
          return;
        }

        ModelCache.put(model, change.property, change.newValue);

        const delta: Delta = {
          model,
          property: change.property,
          newValue: change.newValue,
          timestamp: Date.now()
        };
        this.broadcast(delta);
      });
    }) as unknown as T;
  }

  /**
   * Changes to model properties must be set via this function in order to trigger cache sync
   * @param  {Model} model
   * @param  {T} object
   * @returns void
   */
  public set<T extends StringIndexable>(model: Model, object: T): void {
    let targetModel: StringIndexable | undefined; // to store reference to model to be changed

    switch (model) {
      case Model.Identity:
        targetModel = this.identity;
        break;
      case Model.Properties:
        targetModel = this.properties;
        break;
      case Model.Subscriptions:
        targetModel = this.subscriptions;
        break;
      case Model.Config:
        targetModel = this.config;
        break;
      default:
        break;
    }

    // Proxy observer does not trigger on nested objects
    // We need to change each property individually
    Object.keys(object).forEach(key => {
      if (!!targetModel) {
        targetModel[key] = object[key];
      }
    });
  }
}
