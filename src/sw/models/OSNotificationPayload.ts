import { OSMinifiedNotificationPayload } from "../models/OSMinifiedNotificationPayload";

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
  buttons?: NotificationButtonData[];
};

export class OSNotificationPayload implements IOSNotificationPayload {
  id: string;
  body: string;
  title?: string | undefined;
  url?: string | undefined;
  data?: object | undefined;
  confirmDelivery: boolean;
  icon?: string | undefined;
  image?: string | undefined;
  tag?: string | undefined;
  badge?: string | undefined;
  vibrate?: VibratePattern | undefined;
  buttons?: NotificationButtonData[] | undefined;

  constructor(payload: OSMinifiedNotificationPayload) {
    this.id = payload.custom.i;
    this.title = payload.title;
    this.body = payload.alert;
    this.data = payload.custom.a;
    this.url = payload.custom.u;
    this.confirmDelivery = payload.custom.rr === "y";
    this.icon = payload.icon;
    this.image = payload.image;
    this.tag = payload.tag;
    this.badge = payload.badge;
    this.vibrate = Number(payload.vibrate);

    if (payload.o) {
      this.buttons = [];
      for (const rawButton of payload.o) {
        this.buttons.push({
                            action: rawButton.i,
                            title: rawButton.n,
                            icon: rawButton.p,
                            url: rawButton.u,
                          });
      }
    }
  }
}

interface NotificationButtonData extends NotificationAction {
  url?: string;
};
