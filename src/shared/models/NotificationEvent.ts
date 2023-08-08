import { IOSNotification } from "./OSNotification";

export interface NotificationClickEvent {
  readonly notification: IOSNotification;
  readonly result: NotificationClickResult;
}

// Timestamp is required for internal click handing, but omit it externally
// to simply the public SDK API
export interface NotificationClickEventInternal extends NotificationClickEvent {
  readonly timestamp: number;
}

export interface NotificationClickResult {
  readonly actionId?: string;
  readonly url?: string;
}

export interface NotificationForegroundWillDisplayEventSerializable {
  readonly notification: IOSNotification;
}

export interface NotificationForegroundWillDisplayEvent
  extends NotificationForegroundWillDisplayEventSerializable {
  preventDefault(): void;
}

export interface NotificationDismissEvent {
  notification: IOSNotification;
}
