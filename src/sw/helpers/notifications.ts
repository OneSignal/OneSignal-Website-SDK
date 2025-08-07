import type {
  IOSNotification,
  IOSNotificationActionButton,
  NotificationAction,
} from 'src/shared/notifications/types';
import type {
  OSMinifiedButtonsPayload,
  OSMinifiedNotificationPayload,
} from '../serviceWorker/types';

export function toOSNotification(
  payload: OSMinifiedNotificationPayload,
): IOSNotification {
  return {
    notificationId: payload.custom.i,
    title: payload.title,
    body: payload.alert,
    additionalData: payload.custom.a,
    launchURL: payload.custom.u,
    confirmDelivery: payload.custom.rr === 'y',
    icon: payload.icon,
    image: payload.image,
    actionButtons: convertButtons(payload.o),
    topic: payload.tag,
    badgeIcon: payload.badge,
  };
}

function convertButtons(
  payloadButtons?: OSMinifiedButtonsPayload[],
): IOSNotificationActionButton[] | undefined {
  return payloadButtons?.map(
    (button): IOSNotificationActionButton => ({
      actionId: button.i,
      text: button.n,
      icon: button.p,
      launchURL: button.u,
    }),
  );
}

export function isValidPayload(payload: any): boolean {
  return typeof payload?.custom?.i === 'string';
}

export function toNativeNotificationAction(
  actionPayload?: IOSNotificationActionButton[],
): NotificationAction[] | undefined {
  return actionPayload?.map(
    (payload): NotificationAction => ({
      action: payload.actionId,
      title: payload.text,
      icon: payload.icon,
      // launchURL not a native browser feature.
      // When clicked, we get the action to map it back to the specific
      // IOSNotificationActionButton
    }),
  );
}
