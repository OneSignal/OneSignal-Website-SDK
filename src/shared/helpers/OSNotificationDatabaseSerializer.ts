import type {
  IOSNotification,
  IOSNotificationActionButton,
  NotificationClickEventInternal,
} from 'src/shared/notifications/types';
import type {
  OutcomesNotificationClicked,
  OutcomesNotificationReceived,
} from '../models/OutcomesNotificationEvents';
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
      action: result.actionId,
      badge: notification.badgeIcon,
      buttons: this.toDatabaseButtons(notification.actionButtons),
      content: notification.body,
      data: notification.additionalData,
      heading: notification.title,
      icon: notification.icon,
      id: notification.notificationId,
      image: notification.image,
      rr: notification.confirmDelivery,
      tag: notification.topic,
      timestamp: event.timestamp,
      url: result.url,
    };
  }

  private static toDatabaseButtons(
    actionButtons?: IOSNotificationActionButton[],
  ): NotificationButtonsClickForOpenHandlingSchema[] | undefined {
    return actionButtons?.map(
      (button): NotificationButtonsClickForOpenHandlingSchema => ({
        action: button.actionId,
        title: button.text,
        icon: button.icon,
        url: button.launchURL,
      }),
    );
  }

  static fromDatabase(
    record: NotificationClickForOpenHandlingSchema,
  ): NotificationClickEventInternal {
    return {
      result: {
        actionId: record.action,
        url: record.url,
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
    buttons?: NotificationButtonsClickForOpenHandlingSchema[],
  ): IOSNotificationActionButton[] | undefined {
    return buttons?.map(
      (button): IOSNotificationActionButton => ({
        actionId: button.action,
        text: button.title,
        icon: button.icon,
        launchURL: button.url,
      }),
    );
  }
}

export interface NotificationClickedForOutcomesSchema {
  readonly appId: string;
  readonly notificationId: string; // indexDb's keyPath
  readonly timestamp: number;
}

export class NotificationClickedForOutcomesSerializer {
  static toDatabase(
    appId: string,
    event: NotificationClickEventInternal,
  ): NotificationClickedForOutcomesSchema {
    return {
      appId: appId,
      notificationId: event.notification.notificationId,
      timestamp: event.timestamp,
    };
  }

  static fromDatabase(
    record: NotificationClickedForOutcomesSchema,
  ): OutcomesNotificationClicked {
    return {
      appId: record.appId,
      notificationId: record.notificationId,
      timestamp: record.timestamp,
    };
  }
}

export interface NotificationReceivedForOutcomesSchema {
  readonly appId: string;
  readonly notificationId: string; // indexDb's keyPath
  readonly timestamp: number;
}

export class NotificationReceivedForOutcomesSerializer {
  static toDatabase(
    appId: string,
    notification: IOSNotification,
    timeStamp: number,
  ): NotificationReceivedForOutcomesSchema {
    return {
      appId: appId,
      notificationId: notification.notificationId,
      timestamp: timeStamp,
    };
  }

  static fromDatabase(
    record: NotificationReceivedForOutcomesSchema,
  ): OutcomesNotificationReceived {
    return {
      appId: record.appId,
      notificationId: record.notificationId,
      timestamp: record.timestamp,
    };
  }
}
