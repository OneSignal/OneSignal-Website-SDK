import {
  INotificationButtonPayload,
  IOSNotificationPayload
} from './IOSNotificationPayload';
import { NotificationActionButton } from '../../page/models/NotificationActionButton';

// Public SDK API
export interface IOSNotification {
  // The OneSignal notification id;
  //   - Primary id on OneSignal's REST API and dashboard
  readonly notificationId: string;

  // Visible title text on the notification
  readonly title?: string;

  // Visible body text on the notification
  readonly body: string;

  // Visible icon the end-user sees on the notification; URL format
  readonly icon?: string;

  // Visible image on the notification; URL format
  readonly image?: string;

  // Visible buttons on the notification
  readonly actionButtons?: NotificationActionButton[];
  
  // Only one notification will be visible per value
  // Can be set when creating the notification with "Web Push Topic" on the dashboard
  // or web_push_topic from the REST API.
  readonly topic?: string;

  // Custom object that was sent with the notification;
  // definable when creating the notification from the OneSignal REST API or dashboard
  readonly additionalData?: object;

  // URL to open when clicking or tapping on the notification
  readonly launchURL?: string;
}

export class OSNotification implements IOSNotification {
  readonly notificationId: string;
  readonly title?: string;
  readonly body: string;
  readonly icon?: string;
  readonly image?: string;
  readonly actionButtons?: NotificationActionButton[];
  readonly topic?: string;
  readonly additionalData?: object;
  readonly launchURL?: string;
  
  constructor(payload: IOSNotificationPayload) {
    this.notificationId = payload.id;
    this.title = payload.title;
    this.body = payload.body;
    this.icon = payload.icon;
    this.image = payload.image;
    this.actionButtons = this.convertButtons(payload.buttons);
    this.topic = payload.tag;
    this.additionalData = payload.data;
    this.launchURL = payload.url;
  }

  private convertButtons(
    payloadButtons?: INotificationButtonPayload[]
  ): NotificationActionButton[] | undefined {
    return payloadButtons?.map(
      (button): NotificationActionButton => ({
        id: button.action,
        text: button.title,
        icon: button.icon,
        launchURL: button.url
      })
    );
  }
}

export interface NotificationReceived {
  notificationId: string;
  appId: string;
  launchURL?: string;
  timestamp: number;
}

// used to store click info in IndexedDB
export interface NotificationClicked {
  appId: string;
  notificationId: string;
  actionId: string;
  launchURL?: string;
  timestamp: number;
}
