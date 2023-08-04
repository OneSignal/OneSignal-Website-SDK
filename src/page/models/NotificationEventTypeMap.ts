import {
  NotificationClickEvent,
  NotificationForegroundWillDisplayEvent,
  NotificationDismissEvent,
} from "../../shared/models/NotificationEvent";

type NotificationEventTypeMap = {
  'click': NotificationClickEvent;
  'foregroundWillDisplay': NotificationForegroundWillDisplayEvent;
  'dismiss': NotificationDismissEvent;
  'permissionChange': boolean;
  'permissionPromptDisplay': void;
};

export default NotificationEventTypeMap;
