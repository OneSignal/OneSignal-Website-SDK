import { IOSWebhookEventPayload } from '../../IOSWebhookEventPayload';
import { IOSNotification } from '../../../../shared/models/OSNotification';

export class OSWebhookPayloadNotificationWillDisplay
  implements IOSWebhookEventPayload
{
  readonly event: string = 'notification.willDisplay';
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
