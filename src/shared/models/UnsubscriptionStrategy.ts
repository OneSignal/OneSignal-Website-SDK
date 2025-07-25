export const UnsubscriptionStrategy = {
  /**
   * Actually unsubscribe the user by removing the push subscription.
   */
  DestroySubscription: 0,
  /**
   * Mute the user from receiving notifications by marking a flag in our database.
   */
  MarkUnsubscribed: 1,
} as const;

export type UnsubscriptionStrategyValue =
  (typeof UnsubscriptionStrategy)[keyof typeof UnsubscriptionStrategy];
