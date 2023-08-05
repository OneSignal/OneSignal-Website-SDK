import { IOSNotificationActionButton } from "../../shared/models/OSNotification";

export class OSNotificationButtonsConverter {
  static toNative(
    actionPayload?: IOSNotificationActionButton[]
  ): NotificationAction[] | undefined {
    return actionPayload?.map(
      (payload): NotificationAction => ({
        action: payload.actionId,
        title: payload.text,
        icon: payload.icon,
        // launchURL not a native browser feature.
        // When clicked, we get the action to map it back to the specific
        // IOSNotificationActionButton
      })
    );
  }
}
