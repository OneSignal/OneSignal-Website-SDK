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
import { SubscriptionsCollection } from "../onesignal/subscriptions/SubscriptionsCollection";

interface StringIndexable {
  [key: string]: any;
}

export default class ModelRepo extends Subscribable<Delta> {
  readonly identity: IdentityModel;
  readonly properties: UserProperties;
  readonly subscriptions: SubscriptionsCollection;
  readonly config: AppConfig;

  private isUpdatingFromHydrator?: boolean;

  constructor(private modelCache: ModelCache) {
    super();
    this.identity = this.createObserver(Model.Identity, modelCache.identity);
    this.properties = this.createObserver(Model.Properties, modelCache.properties);
    this.subscriptions = this.createObserver(Model.Subscriptions, modelCache.subscriptions);
    this.config = this.createObserver(Model.Config, modelCache.config);
  }

  public async getCachedConfig(): Promise<AppConfig> {
    return await this.modelCache.get(Model.Config);
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

        await this.modelCache.put(model, change.property, change.newValue);

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
    });
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
