export interface SubscriptionIdAwaitable {
  /*
   * Should provide an awaitable until we can guarantee a subscriptionId is available
   */
  getSubscriptionId(): Promise<string>;
}
