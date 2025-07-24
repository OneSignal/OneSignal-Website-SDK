import type {
  NotificationClickEvent,
  NotificationDismissEvent,
  NotificationForegroundWillDisplayEvent,
} from '../../shared/models/NotificationEvent';

export type NotificationEventTypeMap = {
  click: NotificationClickEvent;
  foregroundWillDisplay: NotificationForegroundWillDisplayEvent;
  dismiss: NotificationDismissEvent;
  permissionChange: boolean;
  permissionPromptDisplay: void;
};
