export const NotificationPermission = {
  /**
   * The user has not granted notification permissions and may have just dismissed the notification permission prompt.
   */
  Default: 'default',
  /**
   * The user has granted notification permissions.
   */
  Granted: 'granted',
  /**
   * The user has blocked notifications.
   */
  Denied: 'denied',
} as const;

export type NotificationPermissionValue =
  (typeof NotificationPermission)[keyof typeof NotificationPermission];
