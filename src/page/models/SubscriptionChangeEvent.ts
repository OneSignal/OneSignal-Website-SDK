interface PushSubscriptionNamespaceProperties {
  id: string | null | undefined;
  token: string | null | undefined;
  optedIn: boolean;
}

export interface SubscriptionChangeEvent {
  previous: PushSubscriptionNamespaceProperties;
  current: PushSubscriptionNamespaceProperties;
}
