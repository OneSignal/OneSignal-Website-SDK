import { OSNotificationPayload } from "../../../models/OSNotificationPayload";
import { IOSWebhookEventPayload } from "../../IOSWebhookEventPayload";

export class OSWebhookPayloadNotificationWillDisplay implements IOSWebhookEventPayload {
  readonly event: string = "notification.willDisplay";
  readonly notificationId: string;
  readonly heading?: string;
  readonly content: string;
  readonly additionalData?: object;
  readonly actionId?: string;

  constructor(notification: OSNotificationPayload) {
    this.notificationId = notification.id;
    this.heading = notification.title;
    this.content = notification.body;
    this.additionalData = notification.data;
  }
}
