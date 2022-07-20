import {
  ConfigModel,
  Delta,
  IdentityModel,
  Model,
  ObservableSlimChange,
  PropertiesModel,
  SessionModel,
  SubscriptionsModel
} from "../types";
import ObservableSlim from 'observable-slim';
import OneSignal from "../../OneSignal";
import Subscribable from "../Subscribable";
import equal from 'fast-deep-equal/es6';

export default class ModelRepo extends Subscribable<Delta> {
  public session?: SessionModel;
  public identity?: IdentityModel;
  public properties?: PropertiesModel;
  public subscriptions?: SubscriptionsModel;
  public config?: ConfigModel;

  private _session: SessionModel = {};
  private _identity: IdentityModel = {};
  private _properties: PropertiesModel = {};
  private _subscriptions: SubscriptionsModel = {};
  private _config: ConfigModel = {};

  constructor(private oneSignal: OneSignal) {
    super();
  }

  /**
   * IMPORTANT: Must be called after instantiation to complete setup process
   *  * loads models from cache
   *  * creates Proxy observers assigned to public top-level class model properties
   *  * observers will trigger writes to cache immediately upon object mutation (see `createObserver`)
   */
  public async setup(): Promise<void> {
    console.log("setting up");
    // ES5 limitation: object properties must be known at creation time
    // TO DO: full model must be stored (e.g: with null values for empty props)
    this._session =
      await this.oneSignal.system.modelCache.get(Model.Session); // might need to pull from session service
    this._identity = await this.oneSignal.system.modelCache.get(Model.Identity);
    this._properties = await this.oneSignal.system.modelCache.get(Model.Properties); // might need to pull from remote
    this._subscriptions = await this.oneSignal.system.modelCache.get(Model.Subscriptions);
    this._config = await this.oneSignal.system.modelCache.get(Model.Config);

    this.session = this.createObserver(this._session, Model.Session);
    this.identity = this.createObserver(this._identity, Model.Identity);
    this.properties = this.createObserver(this._properties, Model.Properties);
    this.subscriptions = this.createObserver(this._subscriptions, Model.Subscriptions);
    this.config = this.createObserver(this._config, Model.Config);

    // set up subscriptions to hydrate models
    this.oneSignal.system.requestService.identityHydrator.subscribe((identity: IdentityModel) => {
      this.identity = identity;
    });
    this.oneSignal.system.requestService.configHydrator.subscribe((config: ConfigModel) => {
      this.config = config;
    });
    this.oneSignal.system.requestService.propertiesHydrator.subscribe((properties: PropertiesModel) => {
      this.properties = properties;
    });
    this.oneSignal.system.requestService.subscriptionsHydrator.subscribe((subscriptions: SubscriptionsModel) => {
      this.subscriptions = subscriptions;
    });
  }

  /**
   * Uses ObservableSlim lib to detect object changes
   * https://github.com/ElliotNB/observable-slim
   * Observer triggers a write to cache
   * @param  {object} target - the object to observe
   * @param  {Model} model - the model the change corresponds to
   * @returns object
   */
  private createObserver(target: object, model: Model): object {
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
}