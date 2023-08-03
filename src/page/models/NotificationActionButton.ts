export interface NotificationActionButton {
  /**
   * Any unique identifier to represent which button was clicked. This is typically passed back to the service worker
   * and host page through events to identify which button was clicked.
   * e.g. 'like-button'
   */
  id: string;
  /**
   * The notification action button's text.
   */
  text: string;
  /**
   * A valid publicly reachable HTTPS URL to an image.
   */
  icon?: string;
  /**
   * The URL to open the web browser to when this action button is clicked.
   */
  launchURL?: string;
}
