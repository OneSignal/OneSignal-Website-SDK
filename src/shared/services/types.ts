import type UserNamespace from 'src/onesignal/UserNamespace';
import type { SubscriptionChangeEvent } from 'src/page/models/SubscriptionChangeEvent';
import type { UserChangeEvent } from 'src/page/models/UserChangeEvent';
import type { BellState } from '../../page/bell/Bell';
import type Emitter from '../libraries/Emitter';
import type {
  NotificationClickEvent,
  NotificationDismissEvent,
  NotificationForegroundWillDisplayEvent,
} from '../notifications/types';

export type EventsMap = {
  change: SubscriptionChangeEvent | undefined;
  click: NotificationClickEvent;
  dismiss: NotificationDismissEvent;
  foregroundWillDisplay: NotificationForegroundWillDisplayEvent;

  /**
   * Occurs after the SDK finishes its final internal initialization. The final initialization event.
   */
  initialize: void;

  initializeInternal: void;
  notifyButtonButtonClick: void;
  notifyButtonHover: void;
  notifyButtonHovering: void;
  notifyButtonLauncherClick: void;
  notifyButtonStateChange: { from: BellState; to: BellState };
  notifyButtonSubscribeClick: void;
  notifyButtonUnsubscribeClick: void;
  'os.sessionStarted': void;
  permissionChange: boolean;
  permissionChangeAsString: NotificationPermission;
  permissionPromptDisplay: void;
  register: void;
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

export type NotificationEventsMap = Pick<
  EventsMap,
  | 'click'
  | 'foregroundWillDisplay'
  | 'dismiss'
  | 'permissionChange'
  | 'permissionPromptDisplay'
>;

export type EventTriggerArgs =
  | ['change', UserChangeEvent, typeof UserNamespace.emitter]
  | {
      [K in keyof EventsMap]: [K, EventsMap[K], Emitter?] | [K];
    }[keyof EventsMap];

export type EventListenerArgs = {
  [K in keyof EventsMap]: [K, (data: EventsMap[K]) => void];
}[keyof EventsMap];
