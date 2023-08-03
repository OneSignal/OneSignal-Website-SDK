
/**
 * the data payload on the notification event notification object
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NotificationEvent
 *
 * @example
 * NotificationEvent {
 *  action: "action"
 *  notification: Notification {
 *    actions: (2) [{…}, {…}]
 *    badge: ""
 *    body: "Test Message"
 *    data: {…}  <------ this is the IOSNotificationPayload
 *  }
 * }
 */

export interface IOSNotificationPayload {
  id: string;
  body: string;
  title?: string;
  url?: string;
  data?: object;
  confirmDelivery: boolean;
  icon?: string;
  image?: string;
  tag?: string;
  badge?: string;
  vibrate?: VibratePattern;
  buttons?: INotificationButtonPayload[];
};

export interface INotificationButtonPayload extends NotificationAction {
  url?: string;
};
