import { IOSNotification } from "../../shared/models/OSNotification";

// post-user-model
export interface NotificationClickEvent {
  notification: IOSNotification;
  result: NotificationClickResult;
}

export type NotificationClickResult = {
  actionId: string;
  url?: string;
}

export interface NotificationForegroundWillDisplayEvent {
  notification: IOSNotification;
  preventDefault(): void;
}

export interface NotificationDismissEvent {
  notification: IOSNotification;
}
