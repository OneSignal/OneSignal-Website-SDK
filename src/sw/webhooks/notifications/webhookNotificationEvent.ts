import type {
  IOSNotification,
  NotificationClickEvent,
} from 'src/shared/notifications/types';
import { send } from '../sender';

export async function notificationClick(
  event: NotificationClickEvent,
  subscriptionId: string | undefined,
): Promise<void> {
  const notification = event.notification;
  return await send({
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

export async function notificationWillDisplay(
  notification: IOSNotification,
  subscriptionId: string | undefined,
): Promise<void> {
  return await send({
    event: 'notification.willDisplay',
    notificationId: notification.notificationId,
    heading: notification.title,
    content: notification.body,
    additionalData: notification.additionalData,
    url: notification.launchURL,
    subscriptionId,
  });
}

export async function notificationDismissed(
  notification: IOSNotification,
  subscriptionId: string | undefined,
): Promise<void> {
  return await send({
    event: 'notification.dismissed',
    notificationId: notification.notificationId,
    heading: notification.title,
    content: notification.body,
    additionalData: notification.additionalData,
    url: notification.launchURL,
    subscriptionId,
  });
}
