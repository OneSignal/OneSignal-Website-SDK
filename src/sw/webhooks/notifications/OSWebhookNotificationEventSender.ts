import { NotificationClickEvent } from '../../../shared/models/NotificationEvent';
import { OSWebhookSender } from './../OSWebhookSender';

import { OSWebhookPayloadNotificationClick } from './payloads/OSWebhookPayloadNotificationClick';
import { OSWebhookPayloadNotificationWillDisplay } from './payloads/OSWebhookPayloadNotificationWillDisplay';
import { OSWebhookPayloadNotificationDismiss } from './payloads/OSWebhookPayloadNotificationDismiss';
import { IOSNotification } from '../../../shared/models/OSNotification';

export class OSWebhookNotificationEventSender {
  constructor(
    private readonly sender: OSWebhookSender = new OSWebhookSender(),
  ) {}

  async click(
    event: NotificationClickEvent,
    subscriptionId: string | undefined,
  ): Promise<void> {
    return await this.sender.send(
      new OSWebhookPayloadNotificationClick(event, subscriptionId),
    );
  }

  async willDisplay(
    notification: IOSNotification,
    subscriptionId: string | undefined,
  ): Promise<void> {
    return await this.sender.send(
      new OSWebhookPayloadNotificationWillDisplay(notification, subscriptionId),
    );
  }

  async dismiss(
    notification: IOSNotification,
    subscriptionId: string | undefined,
  ): Promise<void> {
    return await this.sender.send(
      new OSWebhookPayloadNotificationDismiss(notification, subscriptionId),
    );
  }
}
