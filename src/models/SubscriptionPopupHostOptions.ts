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

  /**
   * Describes whether the popup is significantly minimized in size (to a small
   * rectangle) and the permission prompt is automatically shown. This is used
   * in conjunction with our HTTP permission request.
   *
   * The text on the screen says "This window will automatically close".
   */
  httpPermissionRequest: boolean;
}
