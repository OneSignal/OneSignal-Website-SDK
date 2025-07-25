import type { IOSNotification } from '../../../../shared/models/OSNotification';
import type { IOSWebhookEventPayload } from '../../IOSWebhookEventPayload';

export class OSWebhookPayloadNotificationDismiss
  implements IOSWebhookEventPayload
{
  readonly event: string = 'notification.dismissed';
  readonly notificationId: string;
  readonly heading?: string;
  readonly content: string;
  readonly additionalData?: object;
  readonly actionId?: string;
  readonly url?: string;

  readonly subscriptionId?: string;

  constructor(
    notification: IOSNotification,
    subscriptionId: string | undefined,
  ) {
    this.notificationId = notification.notificationId;
    this.heading = notification.title;
    this.content = notification.body;
    this.additionalData = notification.additionalData;
    this.url = notification.launchURL;

    this.subscriptionId = subscriptionId;
  }
}
