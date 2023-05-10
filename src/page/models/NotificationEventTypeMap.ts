import { NotificationClickResult, NotificationForegroundWillDisplayEvent } from "./NotificationEvent";

type NotificationEventTypeMap = {
  'click': NotificationClickResult;
  'foregroundWillDisplay': NotificationForegroundWillDisplayEvent;
  'dismiss': OSNotificationDataPayload;
  'permissionChange': boolean;
  'permissionPromptDisplay': void;
};

export default NotificationEventTypeMap;
