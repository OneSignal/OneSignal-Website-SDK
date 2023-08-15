export const enum UnsubscriptionStrategy {
  /**
   * Actually unsubscribe the user by removing the push subscription.
   */
  DestroySubscription,
  /**
   * Mute the user from receiving notifications by marking a flag in our database.
   */
  MarkUnsubscribed
}
