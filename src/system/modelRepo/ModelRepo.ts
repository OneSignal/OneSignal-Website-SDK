import {
  Delta,
} from "../types";
import OneSignal from "../../OneSignal";
import Subscribable from "../Subscribable";
export default class ModelRepo extends Subscribable<Delta> {
  public session?: SessionModel;
  public identity?: IdentityModel;
  public properties?: PropertiesModel;
  public subscriptions?: SubscriptionsModel;
  public config?: ConfigModel;

  constructor(private oneSignal: OneSignal) {
    super();
  }
}