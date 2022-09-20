export const enum SubscribeResubscribe {
  /**
   * Describes the intention to subscribe a new push subscription with a possibly new GCM Sender ID or
   */
  Subscribe,
  /**
   * Describes the intention to resubscribe an existing push subscription with the same settings.
   */
  Resubscribe
}
