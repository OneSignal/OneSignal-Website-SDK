export enum NotificationPermission {
  /**
   * The user has not granted notification permissions and may have just dismissed the notification permission prompt.
   */
  Default = "default",
  /**
   * The user has granted notification permissions.
   */
  Granted = "granted",
  /**
   * The user has blocked notifications.
   */
  Denied = "denied"
}
