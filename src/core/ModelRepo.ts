import {
  Delta,
} from "./types";
import Subscribable from "./utils/Subscribable";

export default class ModelRepo extends Subscribable<Delta> {
  public session: SessionModel = {};
  public identity: IdentityModel = {};
  public properties: PropertiesModel = {};
  public subscriptions: SubscriptionsModel = {};
  public config: ConfigModel = {};

  constructor(private modelCache: ModelCache) {
    super();
  }
}
