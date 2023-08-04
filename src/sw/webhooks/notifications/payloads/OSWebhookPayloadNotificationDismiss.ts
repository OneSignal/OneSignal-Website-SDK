import { OSNotificationPayload } from "../../../models/OSNotificationPayload";
import { IOSWebhookEventPayload } from "../../IOSWebhookEventPayload";

export class OSWebhookPayloadNotificationDismiss implements IOSWebhookEventPayload {
  readonly event: string = "notification.dismiss";
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
