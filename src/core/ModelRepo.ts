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
  readonly identity: IdentityModel;
  readonly properties: UserProperties;
  readonly subscriptions: SubscriptionsCollection;
  readonly config: AppConfig;

  private initializedPromise: Promise<void>;
  private identityPromise?: Promise<IdentityModel>;
  private propertiesPromise?: Promise<UserProperties>;
  private subscriptionsPromise?: Promise<SubscriptionsCollection>;
  private configPromise?: Promise<AppConfig>;

  private identityPromiseResolver: (value: IdentityModel | PromiseLike<IdentityModel>) => void = () => {};
  private propertiesPromiseResolver: (value: UserProperties | PromiseLike<UserProperties>) => void = () => {};
  private subscriptionsPromiseResolver:
  (value: SubscriptionsCollection | PromiseLike<SubscriptionsCollection>) => void = () => {};
  private configPromiseResolver: (value: AppConfig | PromiseLike<AppConfig>) => void = () => {};

  private isUpdatingFromHydrator?: boolean;

  constructor() {
    super();
    this.initializedPromise = new Promise<void>(async resolve => {
      /**
       * load cached models
       * ES5 limitation: object properties must be known at creation time
       * for ObservableSlim to work as expected
       */
      const cachedIdentity: IdentityModel = await ModelCache.get(Model.Identity) || DEFAULT_MODELS.identity;
      const cachedProperties: UserProperties = await ModelCache.get(Model.Properties) || DEFAULT_MODELS.properties;
      const cachedSubscriptions: SubscriptionsCollection =
        await ModelCache.get(Model.Subscriptions) || DEFAULT_MODELS.subscriptions;
      const cachedConfig: AppConfig = await this.getCachedConfig() || DEFAULT_MODELS.config;

      // resolve respective promises with observable slim proxies
      this.identityPromiseResolver(this.createObserver(Model.Identity, cachedIdentity));
      this.propertiesPromiseResolver(this.createObserver(Model.Properties, cachedProperties));
      this.subscriptionsPromiseResolver(this.createObserver(Model.Subscriptions, cachedSubscriptions));
      this.configPromiseResolver(this.createObserver(Model.Config, cachedConfig));
      resolve();
    });

    // initialize promises that will be resolved after models are loaded from cache
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

    /**
     * we copy references to the promises which will resolve to the respective models (with observer proxies)
     * we do this to maintain the readonly nature of the models
     * this allows us to trigger model changes by mutating the models but not reassigning
     * them and hence replacing/breaking the observable slim proxy
     */
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
   * Since we cannot re-assign the models due to breaking the observable proxy, we need to mutate them
   * @param  {Model} model
   * @param  {T} object
   * @param {boolean} fromHydrator - if true, we are updating from hydrator and won't broadcast to ops repo
   * @returns void
   */
  public set<T extends StringIndexable>(model: Model, object: T, fromHydrator?: boolean): void {
    this.isUpdatingFromHydrator = fromHydrator;
    let targetModel: StringIndexable; // to store reference to model to be changed

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
