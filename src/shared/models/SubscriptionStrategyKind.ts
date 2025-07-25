/**
 * When subscribing for a web push subscription, describes whether an existing subscription is first
 * unsubscribed or is left intact.
 */
export const SubscriptionStrategyKind = {
  /**
   * Creates a new push subscription or resubscribes an existing push subscription.
   *
   * A new push subscription is created if:
   *   - No existing push subscription exists
   *   - An existing push subscription exists, but the existing subscription's
   *     PushSubscriptionOptions is null
   *
   * If an existing push subscription's PushSubscriptionOptions is null, possibly due to browser
   * profile database corruption or an older or non-standard browser that doesn't support
   * PushSubscriptionOptions, then the entire subscription is first unsubscribed before
   * resubscribing.
   *
   * An existing push subscription is resubscribed (unchanged) if its PushSubscriptionOptions is
   * present.
   *
   * Given an existing legacy GCM subscription, this strategy does not attempt to migrate the
   * subscription to VAPID. Legacy GCM subscriptions have a PushSubscriptionOptions if subscribed in
   * a supporting browser which can be used for resubscribing (i.e. leaving the subscription
   * unchanged still as legacy GCM). Migrating the subscription to VAPID would require first
   * unsubscribing, which this strategy does not attempt.
   */
  ResubscribeExisting: 0,
  /**
   * Unsubscribes an existing push subscription if one exists, and creates a new push subscription
   * with a new endpoint and crypto keys.
   *
   * This strategy will always unsubscribe an existing push subscription if one is present. This
   * strategy is used to "refresh" Microsoft Edge's expiring push subscriptions by obtaining a new
   * subscription with a newly long duration expiration time.
   */
  SubscribeNew: 1,
} as const;

export type SubscriptionStrategyKindValue =
  (typeof SubscriptionStrategyKind)[keyof typeof SubscriptionStrategyKind];
