import { ExecutorConfigMap as ExecutorConfigMap } from '../models/ExecutorConfig';
import { ModelName } from '../models/SupportedModels';
import IdentityRequests from '../requestService/IdentityRequests';
import SubscriptionRequests from '../requestService/SubscriptionRequests';
import UserPropertyRequests from '../requestService/UserPropertyRequests';

const subscriptionConfig = {
  add: SubscriptionRequests.addSubscription,
  remove: SubscriptionRequests.removeSubscription,
  update: SubscriptionRequests.updateSubscription,
};

export const EXECUTOR_CONFIG_MAP: ExecutorConfigMap = {
  [ModelName.Identity]: {
    modelName: ModelName.Identity,
    add: IdentityRequests.addIdentity,
    remove: IdentityRequests.removeIdentity,
  },
  [ModelName.Properties]: {
    modelName: ModelName.Properties,
    update: UserPropertyRequests.updateUserProperties,
  },
  [ModelName.Subscriptions]: {
    modelName: ModelName.Subscriptions,
    ...subscriptionConfig,
  },
};
