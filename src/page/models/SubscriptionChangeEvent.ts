type PushSubscriptionNamespaceProperties = {
  id: string | null | undefined;
  token: string | null | undefined;
  optedIn: boolean;
};

type SubscriptionChangeEvent = {
  previous: PushSubscriptionNamespaceProperties;
  current: PushSubscriptionNamespaceProperties;
};

export default SubscriptionChangeEvent;
