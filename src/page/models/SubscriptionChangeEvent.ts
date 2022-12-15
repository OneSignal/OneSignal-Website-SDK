import { SubscriptionModel } from "../../core/models/SubscriptionModels";

type SubscriptionChangeEvent = {
  previous: Partial<SubscriptionModel>;
  current: Partial<SubscriptionModel>;
};

export default SubscriptionChangeEvent;
