import { SubscriptionType } from "./SubscriptionModel";

export default class FutureSubscription implements FutureSubscription {
  type: SubscriptionType;
  token?: string; // maps to legacy player.identifier

  constructor(type: SubscriptionType, token?: string) {
    this.type = type;
    this.token = token;
  }
}