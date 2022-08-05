import { SubscriptionsCollection } from "../../onesignal/subscriptions/SubscriptionsCollection";
import { AppConfig } from "../../shared/models/AppConfig";
import Database from "../../shared/services/Database";
import { IdentityModel, Model, UserProperties } from "../types";

export default class ModelCache {
  public identity?: IdentityModel;
  public properties?: UserProperties;
  public subscriptions?: SubscriptionsCollection;
  public config?: AppConfig;

  constructor() {}

  async load(): Promise<void> {
    this.identity = await this.get<IdentityModel>(Model.Identity);
    this.properties = await this.get<UserProperties>(Model.Properties);
    this.subscriptions = await this.get<SubscriptionsCollection>(Model.Subscriptions);
    this.config = await this.get<AppConfig>(Model.Config);
  }

  async put(model: Model, property: string, value: object): Promise<void> {
    await Database.put("Models", { key: model, value: { [property]: value } });
  }

  async get<T>(model: Model): Promise<T> {
    return Database.get("Models", model);
  }
}
