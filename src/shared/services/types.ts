import type { BellStateValue } from 'src/page/bell/constants';
import type { SubscriptionChangeEvent } from 'src/page/models/SubscriptionChangeEvent';
import type { UserChangeEvent } from 'src/page/models/UserChangeEvent';
import type {
  NotificationClickEvent,
  NotificationDismissEvent,
  NotificationForegroundWillDisplayEvent,
} from '../notifications/types';

export type EventsMap = {
  /**
   * Occurs after the user is officially subscribed to push notifications. The service worker is fully registered
   * and activated and the user is eligible to receive push notifications at any point after this.
   */
  change: SubscriptionChangeEvent | undefined;

  /**
   * New event replacing legacy addNotificationOpenedHandler(). Used when the notification was clicked.
   */
  click: NotificationClickEvent;

  /**
   * Occurs when a notification is dismissed by the user either clicking 'X' or clearing all notifications
   * (available in Android). This event is NOT called if the user clicks the notification's body or any of the
   * action buttons.
   */
  dismiss: NotificationDismissEvent;

  /**
   * Occurs when a notification is displayed.
   */
  foregroundWillDisplay: NotificationForegroundWillDisplayEvent;

  /**
   * Occurs after the SDK finishes its final internal initialization. The final initialization event.
   */
  initialize: void;

  /**
   * Occurs after the document ready event fires
   */
  initializeInternal: void;

  notifyButtonButtonClick: void;
  notifyButtonHover: void;
  notifyButtonHovering: void;
  notifyButtonLauncherClick: void;
  notifyButtonStateChange: { from: BellStateValue; to: BellStateValue };
  notifyButtonSubscribeClick: void;
  notifyButtonUnsubscribeClick: void;
  'os.sessionStarted': void;

  /**
   * Same as permissionChangeAsString, expect a boolean and will be used to fire
   * events to the public API OneSignal.Notification.addEventListener("permissionChange", function....)
   */
  permissionChange: boolean;

  /**
   * Occurs immediately when the notification permission changes for the domain at the browser level.
   * This normally happens when the user clicks "Allow" or "Block" on the native permission prompt
   * on Chrome, Firefox, etc, however it also changes if the end-user clicks on the lock icon and
   * manually changes it.
   * Occurs BEFORE the actual push subscription is created on on the backend.
   */
  permissionChangeAsString: NotificationPermission;

  /**
   * Occurs when the native permission prompt is displayed.
   */
  permissionPromptDisplay: void;

  /**
   * Occurs after the user subscribes to push notifications and a new user entry is created on OneSignal's server,
   * and also occurs when the user begins a new site session and the last_session and last_active is updated on
   * OneSignal's server.
   */
  register: void;

  /**
   * Occurs after a POST call to OneSignal's server to send the welcome notification has completed. The actual
   * notification arrives shortly after.
   */
  sendWelcomeNotification: {
    title: string;
    message: string;
    url: string;
  };

  slidedownAllowClick: void;
  slidedownCancelClick: void;
  slidedownClosed: void;
  slidedownQueued: void;
  slidedownShown: boolean;
  toastShown: void;
  toastClosed: void;
};

export type UserEventsMap = {
  change: UserChangeEvent;
};

export type EventListenerArgs = {
  [K in keyof EventsMap]: [K, (data: EventsMap[K]) => void];
}[keyof EventsMap];
