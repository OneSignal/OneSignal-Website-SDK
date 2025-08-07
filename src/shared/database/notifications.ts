import {
  notificationClickedForOutcomesFromDatabase,
  notificationClickedForOutcomesToDatabase,
  notificationClickToDatabase,
  notificationReceivedForOutcomesFromDatabase,
  notificationReceivedForOutcomesToDatabase,
} from '../helpers/serializer';
import type {
  OutcomesNotificationClicked,
  OutcomesNotificationReceived,
} from '../models/OutcomesNotificationEvents';
import type {
  IOSNotification,
  NotificationClickEventInternal,
} from '../notifications/types';
import { db } from './client';

export const putNotificationClickedForOutcomes = async (
  appId: string,
  event: NotificationClickEventInternal,
) => {
  await db.put(
    'Outcomes.NotificationClicked',
    notificationClickedForOutcomesToDatabase(appId, event),
  );
};

export const putNotificationReceivedForOutcomes = async (
  appId: string,
  notification: IOSNotification,
) => {
  await db.put(
    'Outcomes.NotificationReceived',
    notificationReceivedForOutcomesToDatabase(appId, notification, Date.now()),
  );
};

export const putNotificationClickedEventPendingUrlOpening = async (
  event: NotificationClickEventInternal,
) => {
  await db.put('NotificationOpened', notificationClickToDatabase(event));
};

export const getAllNotificationClickedForOutcomes = async (): Promise<
  OutcomesNotificationClicked[]
> => {
  const notifications = await db.getAll('Outcomes.NotificationClicked');
  return notifications.map((notification) =>
    notificationClickedForOutcomesFromDatabase(notification),
  );
};

export const getAllNotificationReceivedForOutcomes = async (): Promise<
  OutcomesNotificationReceived[]
> => {
  const notifications = await db.getAll('Outcomes.NotificationReceived');
  return notifications.map((notification) =>
    notificationReceivedForOutcomesFromDatabase(notification),
  );
};
