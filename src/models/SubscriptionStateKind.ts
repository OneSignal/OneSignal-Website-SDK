export enum SubscriptionStateKind {
  Subscribed = 1,
  MutedByApi = -2,
  NotSubscribed = -10,
  TemporaryWebRecord = -20,
  PermissionRevoked = -21,
  PushSubscriptionRevoked = -22,
}
