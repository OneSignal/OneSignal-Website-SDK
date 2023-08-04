import { NotificationClickEvent } from "../../../../shared/models/NotificationEvent";
import { IOSWebhookEventPayload } from "../../IOSWebhookEventPayload";

export class OSWebhookPayloadNotificationClick implements IOSWebhookEventPayload {
  readonly event: string = "notification.clicked";
  readonly notificationId: string;
  readonly heading?: string;
  readonly content: string;
  readonly additionalData?: object;
  readonly actionId?: string;

  constructor(notificationClickEvent: NotificationClickEvent) {
    const notification = notificationClickEvent.notification;
    this.notificationId = notification.notificationId;
    this.heading = notification.title;
    this.content = notification.body;
    this.additionalData = notification.additionalData;

    this.actionId = notificationClickEvent.result.actionId;
  }
}
