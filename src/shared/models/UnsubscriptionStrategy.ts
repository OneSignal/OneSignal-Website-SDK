export const UnsubscriptionStrategy = {
  /**
   * Actually unsubscribe the user by removing the push subscription.
   */
  _DestroySubscription: 0,

  /**
   * Mute the user from receiving notifications by marking a flag in our database.
   */
  _MarkUnsubscribed: 1,
} as const;

export type UnsubscriptionStrategyValue =
  (typeof UnsubscriptionStrategy)[keyof typeof UnsubscriptionStrategy];
