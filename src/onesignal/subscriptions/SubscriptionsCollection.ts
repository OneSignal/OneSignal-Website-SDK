import SubscriptionModel, { FutureSubscription } from "./SubscriptionModel";

export type SubscriptionsCollection = {
  push?: SubscriptionModel | FutureSubscription;
  email?: Array<SubscriptionModel | FutureSubscription>;
  sms?: Array<SubscriptionModel | FutureSubscription>;
};
