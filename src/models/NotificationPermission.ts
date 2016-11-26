enum NotificationPermission {
  /**
   * The user has not granted notification permissions and may have just dismissed the notification permission prompt.
   */
  Default = <any>"default",
  /**
   * The user has granted notification permissions.
   */
  Granted = <any>"granted",
  /**
   * The user has blocked notifications.
   */
  Denied = <any>"denied"
}

export { NotificationPermission };