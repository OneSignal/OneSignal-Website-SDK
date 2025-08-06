import type { NotificationClickEvent } from 'src/shared/notifications/types';
import type { IOSWebhookEventPayload } from 'src/sw/serviceWorker/types';

export class OSWebhookPayloadNotificationClick
  implements IOSWebhookEventPayload
{
  readonly event: string = 'notification.clicked';
  readonly notificationId: string;
  readonly heading?: string;
  readonly content: string;
  readonly additionalData?: object;
  readonly actionId?: string;
  readonly url?: string;

  readonly subscriptionId?: string;

  constructor(
    notificationClickEvent: NotificationClickEvent,
    subscriptionId: string | undefined,
  ) {
    const notification = notificationClickEvent.notification;
    this.notificationId = notification.notificationId;
    this.heading = notification.title;
    this.content = notification.body;
    this.additionalData = notification.additionalData;

    this.actionId = notificationClickEvent.result.actionId;
    this.url = notificationClickEvent.result.url;

    this.subscriptionId = subscriptionId;
  }
}
