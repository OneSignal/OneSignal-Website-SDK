import { OSNotification } from "../../shared/models/OSNotification";

// post-user-model
export interface NotificationClickEvent {
  notification: OSNotification;
  result: NotificationClickResult;
}

export type NotificationClickResult = {
  actionId?: string;
  url?: string;
}

export interface NotificationForegroundWillDisplayEvent {
  notification: OSNotification;
  preventDefault(): void;
}
