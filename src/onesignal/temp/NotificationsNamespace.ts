import { NotificationActionButton } from "../../page/models/NotificationActionButton";

type NotificationEventObject = any;

export interface NotificationsNamespace {
  getPermissionStatus: () => boolean;
  setDefaultUrl: (url: string) => void;
  setDefaultTitle: (title: string) => void;

  requestPermission: () => void;
  getPermission: (onComplete?: Action<NotificationPermission>) => NotificationPermission;
  isPushSupported: () => boolean;

  sendSelfPush: (
    title: string,
    message: string,
    url: string,
    icon: URL,
    data: Map<String, any>,
    buttons: Array<NotificationActionButton>
  ) => void;

  disable: (isDisabled: boolean) => void;
  isOptedOut: () => boolean;

  on: (event: NotificationEvent, callback: (event: NotificationEventObject) => void) => void;
}
