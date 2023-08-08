import { NotificationClickEventInternal } from "../models/NotificationEvent";
import { IOSNotification, IOSNotificationActionButton } from "../models/OSNotification";
import { OutcomesNotificationClicked, OutcomesNotificationReceived } from "../models/OutcomesNotificationEvents";
/**
 * Purpose: This file defines mapping so any changes to the public
 * classes don't break indexDb serialization.
 * 
 * Naming Rules:
 *    1. All classes that convert types to / from the db
 *    must end in Serialize.
 *    2. All interfaces used with classes ending in Serialize
 *    must end in Schema.
 * 
 * NOTE: Any change made to interfaces that end in Schema require
 *       bumping the indexDb.ts version and creating a migration.
 */

// Purpose: Used to fire the 'click' event and open a page it's URL.
//    * Only used if no pages are open for the website
export interface NotificationClickForOpenHandlingSchema {
  readonly id: string; // indexDb's keyPath
  readonly heading?: string;
  readonly content: string;
  readonly data?: object;
  readonly url?: string;
  readonly rr: boolean;
  readonly icon?: string;
  readonly image?: string;
  readonly tag?: string;
  readonly badge?: string;
  readonly action?: string;
  readonly buttons?: NotificationButtonsClickForOpenHandlingSchema[];
  readonly timestamp: number;
}

interface NotificationButtonsClickForOpenHandlingSchema {
  readonly action: string;
  readonly title: string;
  readonly icon?: string;
  readonly url?: string;
}

export class NotificationClickForOpenHandlingSerializer {
  static toDatabase(
    event: NotificationClickEventInternal,
  ): NotificationClickForOpenHandlingSchema {
    const notification = event.notification;
    const result = event.result;
    return {
      id: notification.notificationId,
      heading: notification.title,
      content: notification.body,
      data: notification.additionalData,
      url: result.url,
      rr: notification.confirmDelivery,
      icon: notification.icon,
      image: notification.image,
      tag: notification.topic,
      badge: notification.badgeIcon,
      action: result.actionId,
      buttons: this.toDatabaseButtons(notification.actionButtons),
      timestamp: event.timestamp,
    }
  }

  private static toDatabaseButtons(
    actionButtons?: IOSNotificationActionButton[]
  ): NotificationButtonsClickForOpenHandlingSchema[] | undefined {
    return actionButtons?.map(
      (button): NotificationButtonsClickForOpenHandlingSchema => ({
        action: button.actionId,
        title: button.text,
        icon: button.icon,
        url: button.launchURL
      })
    );
  }

  static fromDatabase(
    record: NotificationClickForOpenHandlingSchema,
  ): NotificationClickEventInternal {
    return {
      result: {
        actionId: record.action,
        url: record.url
      },
      notification: {
        notificationId: record.id,
        title: record.heading,
        body: record.content,
        additionalData: record.data,
        launchURL: record.url,
        confirmDelivery: record.rr,
        icon: record.icon,
        image: record.image,
        topic: record.tag,
        badgeIcon: record.badge,
        actionButtons: this.toOSNotificationButtons(record.buttons),
      },
      timestamp: record.timestamp,
    };
  }

  private static toOSNotificationButtons(
    buttons?: NotificationButtonsClickForOpenHandlingSchema[]
  ): IOSNotificationActionButton[] | undefined {
    return buttons?.map(
      (button): IOSNotificationActionButton => ({
        actionId: button.action,
        text: button.title,
        icon: button.icon,
        launchURL: button.url
      })
    );
  }
}

