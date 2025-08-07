// Public SDK API
export interface IOSNotification {
  /**
   * The OneSignal notification id;
   *  - Primary id on OneSignal's REST API and dashboard
   */
  readonly notificationId: string;

  /**
   * Visible title text on the notification
   */
  readonly title?: string;

  /**
   * Visible body text on the notification
   */
  readonly body: string;

  /**
   * Visible icon the notification; URL format
   */
  readonly icon?: string;

  /**
   * Visible small badgeIcon that displays on some devices; URL format
   * Example: On Android's status bar
   */
  readonly badgeIcon?: string;

  /**
   * Visible image on the notification; URL format
   */
  readonly image?: string;

  /**
   * Visible buttons on the notification
   */
  readonly actionButtons?: IOSNotificationActionButton[];

  /**
   * If this value is the same as existing notification, it will replace it
   * Can be set when creating the notification with "Web Push Topic" on the dashboard
   * or web_push_topic from the REST API.
   */
  readonly topic?: string;

  /**
   * Custom object that was sent with the notification;
   * definable when creating the notification from the OneSignal REST API or dashboard
   */
  readonly additionalData?: object;

  /**
   * URL to open when clicking or tapping on the notification
   */
  readonly launchURL?: string;

  /**
   * Confirm the push was received by reporting back to OneSignal
   */
  readonly confirmDelivery: boolean;
}

export interface IOSNotificationActionButton {
  /**
   * Any unique identifier to represent which button was clicked. This is typically passed back to the service worker
   * and host page through events to identify which button was clicked.
   * e.g. 'like-button'
   */
  readonly actionId: string;
  /**
   * The notification action button's text.
   */
  readonly text: string;
  /**
   * A valid publicly reachable HTTPS URL to an image.
   */
  readonly icon?: string;
  /**
   * The URL to open the web browser to when this action button is clicked.
   */
  readonly launchURL?: string;
}

export interface IMutableOSNotification extends IOSNotification {
  title?: string;
  body: string;
  icon?: string;
  badgeIcon?: string;
  image?: string;
  actionButtons?: IMutableOSNotificationActionButton[];
  topic?: string;
  additionalData?: object;
  launchURL?: string;
  confirmDelivery: boolean;
}

export interface IMutableOSNotificationActionButton
  extends IOSNotificationActionButton {
  actionId: string;
  text: string;
  icon?: string;
  launchURL?: string;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationClickEvent {
  readonly notification: IOSNotification;
  readonly result: NotificationClickResult;
}

// Timestamp is required for internal click handing, but omit it externally
// to simply the public SDK API
export interface NotificationClickEventInternal extends NotificationClickEvent {
  readonly timestamp: number;
}

export interface NotificationClickResult {
  readonly actionId?: string;
  readonly url?: string;
}

export interface NotificationForegroundWillDisplayEventSerializable {
  readonly notification: IOSNotification;
}

export interface NotificationForegroundWillDisplayEvent
  extends NotificationForegroundWillDisplayEventSerializable {
  preventDefault(): void;
}

export interface NotificationDismissEvent {
  notification: IOSNotification;
}

export type NotificationEventTypeMap = {
  click: NotificationClickEvent;
  foregroundWillDisplay: NotificationForegroundWillDisplayEvent;
  dismiss: NotificationDismissEvent;
  permissionChange: boolean;
  permissionPromptDisplay: void;
};

export type NotificationEventName =
  | 'click'
  | 'foregroundWillDisplay'
  | 'dismiss'
  | 'permissionChange'
  | 'permissionPromptDisplay';

export interface NotificationIcons {
  chrome: string | null;
  firefox: string | null;
  safari: string | null;
}
