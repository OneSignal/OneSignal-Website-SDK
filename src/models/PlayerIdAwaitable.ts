export interface PlayerIdAwaitable {
  /*
   * Should provide an awaitable until we can guarantee a playerId is available
   */
  getPlayerId(): Promise<string>;
}
