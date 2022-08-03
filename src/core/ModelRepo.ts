import {
  Delta,
  IdentityModel,
  Model,
  ObservableSlimChange,
  UserProperties,
} from "./types";
import ObservableSlim from 'observable-slim';
import Subscribable from "./utils/Subscribable";
import equal from 'fast-deep-equal/es6';
import ModelCache from "./caches/ModelCache";
import { AppConfig } from "../shared/models/AppConfig";
import DEFAULT_MODELS from "./utils/DefaultModelObjects";
import { SubscriptionsCollection } from "../onesignal/subscriptions/SubscriptionsCollection";

interface StringIndexable {
  [key: string]: any;
}

export default class ModelRepo extends Subscribable<Delta> {
  private initializedPromise: Promise<void>;

  private _identity?: IdentityModel;
  private _properties?: UserProperties;
  private _subscriptions?: SubscriptionsCollection;
  private _config?: AppConfig;

  // these public readonly properties should not be re-assigned, only nested mutations should be allowed
  // to set the entire property, use `set` function
  readonly identity: IdentityModel;
  readonly properties: UserProperties;
  readonly subscriptions: SubscriptionsCollection;
  readonly config: AppConfig;

  private identityPromise?: Promise<IdentityModel>;
  private propertiesPromise?: Promise<UserProperties>;
  private subscriptionsPromise?: Promise<SubscriptionsCollection>;
  private configPromise?: Promise<AppConfig>;

  private isUpdatingFromHydrator?: boolean;

  private identityPromiseResolver: (value: IdentityModel | PromiseLike<IdentityModel>) => void = () => {};
  private propertiesPromiseResolver: (value: UserProperties | PromiseLike<UserProperties>) => void = () => {};
  private subscriptionsPromiseResolver:
    (value: SubscriptionsCollection | PromiseLike<SubscriptionsCollection>) => void = () => {};
  private configPromiseResolver: (value: AppConfig | PromiseLike<AppConfig>) => void = () => {};

  constructor() {
    super();
    this.initializedPromise = new Promise<void>(async resolve => {
      // ES5 limitation: object properties must be known at creation time
      // for ObservableSlim to work as expected
      this._identity = await ModelCache.get(Model.Identity) || DEFAULT_MODELS.identity;
      this._properties = await ModelCache.get(Model.Properties) || DEFAULT_MODELS.properties;
      this._subscriptions = await ModelCache.get(Model.Subscriptions) || DEFAULT_MODELS.subscriptions;
      this._config = await this.getCachedConfig() || DEFAULT_MODELS.config;

      this.identityPromiseResolver(this.createObserver(Model.Identity, this._identity));
      this.propertiesPromiseResolver(this.createObserver(Model.Properties, this._properties));
      this.subscriptionsPromiseResolver(this.createObserver(Model.Subscriptions, this._subscriptions));
      this.configPromiseResolver(this.createObserver(Model.Config, this._config));
      resolve();
    });

    this.identityPromise = new Promise<IdentityModel>(resolve => {
      this.identityPromiseResolver = resolve;
    });
    this.propertiesPromise = new Promise<UserProperties>(resolve => {
      this.propertiesPromiseResolver = resolve;
    });
    this.subscriptionsPromise = new Promise<SubscriptionsCollection>(resolve => {
      this.subscriptionsPromiseResolver = resolve;
    });
    this.configPromise = new Promise<AppConfig>(resolve => {
      this.configPromiseResolver = resolve;
    });

    this.identity = this.identityPromise as unknown as IdentityModel;
    this.properties = this.propertiesPromise as unknown as UserProperties;
    this.subscriptions = this.subscriptionsPromise as unknown as SubscriptionsCollection;
    this.config = this.configPromise as unknown as AppConfig;
  }

  /**
   * Loads models from cache
   * IMPORTANT: Must be called after instantiation to complete setup process
   *  - creates Proxy observers assigned to public top-level class model properties
   *  - observers will trigger writes to cache immediately upon object mutation (see `createObserver`)
   * @returns Promise<AppConfig>
   */
  public async initialize(): Promise<void> {
    await this.initializedPromise;
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
      changes.forEach(async change => {
        if (equal(change.previousValue, change.newValue)) {
          return;
        }

        await ModelCache.put(model, change.property, change.newValue);

        if (this.isUpdatingFromHydrator) {
          this.isUpdatingFromHydrator = false;
          return;
        }

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
  public set<T extends StringIndexable>(model: Model, object: T, fromHydrator?: boolean): void {
    this.isUpdatingFromHydrator = fromHydrator;
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
