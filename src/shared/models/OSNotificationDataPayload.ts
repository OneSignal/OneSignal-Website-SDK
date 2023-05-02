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
 *    data: {…}  <------ this is the OSNotificationDataPayload payload
 *  }
 * }
 */

 type OSNotificationDataPayload = {
  id: string;
  content: string;
  heading?: string;
  url?: string;
  data?: object;
  rr?: string;
  icon?: string;
  image?: string;
  tag?: string;
  badge?: string;
  vibrate?: VibratePattern;
  buttons?: NotificationButtonData[];
};

interface NotificationButtonData extends NotificationAction {
  url: string;
};
