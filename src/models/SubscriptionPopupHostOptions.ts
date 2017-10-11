interface SubscriptionPopupHostOptions {
  /**
   * Describes whether the first screen of the popup (asking users No Thanks or
   * Continue) is shown.
   *
   * If true, this screen is skipped, and users see "Click Allow to receive
   * notifications" with the prompt auto-appearing.
   *
   * If false, users see the first screen.
   */
  autoAccept: boolean;
}
