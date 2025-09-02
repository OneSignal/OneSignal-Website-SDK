import type {
  IOSNotification,
  NotificationClickEvent,
} from 'src/shared/notifications/types';
import { OSWebhookSender } from './../OSWebhookSender';

export class OSWebhookNotificationEventSender {
  private readonly sender: OSWebhookSender;

  constructor(sender: OSWebhookSender = new OSWebhookSender()) {
    this.sender = sender;
  }

  async click(
    event: NotificationClickEvent,
    subscriptionId: string | undefined,
  ): Promise<void> {
    const notification = event.notification;
    return await this.sender.send({
      event: 'notification.clicked',
      notificationId: notification.notificationId,
      heading: notification.title,
      content: notification.body,
      additionalData: notification.additionalData,
      actionId: event.result.actionId,
      url: event.result.url,
      subscriptionId,
    });
  }

  async willDisplay(
    notification: IOSNotification,
    subscriptionId: string | undefined,
  ): Promise<void> {
    return await this.sender.send({
      event: 'notification.willDisplay',
      notificationId: notification.notificationId,
      heading: notification.title,
      content: notification.body,
      additionalData: notification.additionalData,
      url: notification.launchURL,
      subscriptionId,
    });
  }

  async dismiss(
    notification: IOSNotification,
    subscriptionId: string | undefined,
  ): Promise<void> {
    return await this.sender.send({
      event: 'notification.dismissed',
      notificationId: notification.notificationId,
      heading: notification.title,
      content: notification.body,
      additionalData: notification.additionalData,
      url: notification.launchURL,
      subscriptionId,
    });
  }
}
