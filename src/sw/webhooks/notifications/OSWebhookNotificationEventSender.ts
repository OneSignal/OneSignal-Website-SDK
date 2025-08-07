import type {
  IOSNotification,
  NotificationClickEvent,
} from 'src/shared/notifications/types';
import { OSWebhookSender } from './../OSWebhookSender';
import { OSWebhookPayloadNotificationClick } from './payloads/OSWebhookPayloadNotificationClick';
import { OSWebhookPayloadNotificationDismiss } from './payloads/OSWebhookPayloadNotificationDismiss';
import { OSWebhookPayloadNotificationWillDisplay } from './payloads/OSWebhookPayloadNotificationWillDisplay';

export class OSWebhookNotificationEventSender {
  private readonly sender: OSWebhookSender;

  constructor(sender: OSWebhookSender = new OSWebhookSender()) {
    this.sender = sender;
  }

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
