//#region src/shared/notifications/types.d.ts
interface IOSNotification {
  /**
   * The OneSignal notification id;
   *  - Primary id on OneSignal's REST API and dashboard
   */
  readonly notificationId: string;
  /**
   * Visible title text on the notification
   */
  readonly title?: string;
  /**
   * Visible body text on the notification
   */
  readonly body: string;
  /**
   * Visible icon the notification; URL format
   */
  readonly icon?: string;
  /**
   * Visible small badgeIcon that displays on some devices; URL format
   * Example: On Android's status bar
   */
  readonly badgeIcon?: string;
  /**
   * Visible image on the notification; URL format
   */
  readonly image?: string;
  /**
   * Visible buttons on the notification
   */
  readonly actionButtons?: IOSNotificationActionButton[];
  /**
   * If this value is the same as existing notification, it will replace it
   * Can be set when creating the notification with "Web Push Topic" on the dashboard
   * or web_push_topic from the REST API.
   */
  readonly topic?: string;
  /**
   * Custom object that was sent with the notification;
   * definable when creating the notification from the OneSignal REST API or dashboard
   */
  readonly additionalData?: object;
  /**
   * URL to open when clicking or tapping on the notification
   */
  readonly launchURL?: string;
  /**
   * Confirm the push was received by reporting back to OneSignal
   */
  readonly confirmDelivery: boolean;
}
interface IOSNotificationActionButton {
  /**
   * Any unique identifier to represent which button was clicked. This is typically passed back to the service worker
   * and host page through events to identify which button was clicked.
   * e.g. 'like-button'
   */
  readonly actionId: string;
  /**
   * The notification action button's text.
   */
  readonly text: string;
  /**
   * A valid publicly reachable HTTPS URL to an image.
   */
  readonly icon?: string;
  /**
   * The URL to open the web browser to when this action button is clicked.
   */
  readonly launchURL?: string;
}
interface NotificationClickEvent {
  readonly notification: IOSNotification;
  readonly result: NotificationClickResult;
}
interface NotificationClickResult {
  readonly actionId?: string;
  readonly url?: string;
}
interface IDisplayableOSNotification extends IOSNotification {
  /**
   * Displays the notification as a system notification via the service worker.
   * Use after calling {@link NotificationForegroundWillDisplayEvent.preventDefault}
   * to re-display a previously suppressed notification.
   *
   * Do not call `preventDefault()` after calling `display()` as it will have no effect.
   */
  display(): void;
}
interface NotificationForegroundWillDisplayEvent {
  readonly notification: IDisplayableOSNotification;
  /**
   * Prevents the system notification from displaying. Must be called
   * synchronously within the event listener. To show the notification
   * later, use {@link IDisplayableOSNotification.display | event.notification.display()}.
   *
   * Do not call `preventDefault()` after calling `display()` as it will have no effect.
   */
  preventDefault(): void;
}
interface NotificationDismissEvent {
  notification: IOSNotification;
}
type NotificationEventTypeMap = {
  click: NotificationClickEvent;
  foregroundWillDisplay: NotificationForegroundWillDisplayEvent;
  dismiss: NotificationDismissEvent;
  permissionChange: boolean;
  permissionPromptDisplay: void;
};
//#endregion
//#region src/page/tags/types.d.ts
interface TagCategory {
  tag: string;
  label: string;
  checked?: boolean;
}
//#endregion
//#region src/shared/prompts/types.d.ts
type DelayedPromptTypeValue = 'native' | 'push' | 'category' | 'sms' | 'email' | 'smsAndEmail';
interface AppUserConfigPromptOptions {
  autoPrompt?: boolean;
  subscribeText?: string;
  showGraphic?: boolean;
  timeout?: number;
  autoAcceptTitle?: string;
  actionMessage?: string;
  exampleNotificationTitleDesktop?: string;
  exampleNotificationMessageDesktop?: string;
  exampleNotificationTitleMobile?: string;
  exampleNotificationMessageMobile?: string;
  exampleNotificationCaption?: string;
  acceptButton?: string;
  cancelButton?: string;
  acceptButtonText?: string;
  cancelButtonText?: string;
  showCredit?: string;
  native?: DelayedPromptOptions;
  slidedown?: SlidedownOptions;
  fullscreen?: FullscreenPermissionMessageOptions;
  customlink?: AppUserConfigCustomLinkOptions;
}
interface BasePromptOptions {
  enabled: boolean;
}
interface DelayedPromptOptions extends BasePromptOptions {
  autoPrompt?: boolean;
  timeDelay?: number;
  pageViews?: number;
}
interface SlidedownPromptOptions {
  type: DelayedPromptTypeValue;
  text: SlidedownTextOptions;
  autoPrompt: boolean;
  icon?: string | null;
  delay?: SlidedownDelayOptions;
  categories?: TagCategory[];
}
interface SlidedownOptions {
  prompts: SlidedownPromptOptions[];
}
interface SlidedownTextOptions {
  actionMessage: string;
  acceptButton: string;
  cancelButton: string;
  negativeUpdateButton?: string;
  positiveUpdateButton?: string;
  updateMessage?: string;
  confirmMessage?: string;
  smsLabel?: string;
  emailLabel?: string;
}
interface SlidedownDelayOptions {
  pageViews: number;
  timeDelay: number;
}
interface FullscreenPermissionMessageOptions extends DelayedPromptOptions {
  autoAcceptTitle?: string;
  actionMessage: string;
  acceptButton: string;
  cancelButton: string;
  title: string;
  message: string;
  caption: string;
}
interface AppUserConfigCustomLinkOptions extends BasePromptOptions {
  style?: CustomLinkStyle;
  size?: CustomLinkSize;
  unsubscribeEnabled?: boolean;
  text?: {
    explanation?: string;
    subscribe?: string;
    unsubscribe?: string;
  };
  color?: {
    button?: string;
    text?: string;
  };
}
type CustomLinkStyle = 'button' | 'link';
type CustomLinkSize = 'large' | 'medium' | 'small';
type BellSize = 'small' | 'medium' | 'large';
type BellPosition = 'bottom-left' | 'bottom-right';
interface BellText {
  'launcher.button.aria-label'?: string;
  'tip.state.unsubscribed': string;
  'tip.state.subscribed': string;
  'tip.state.blocked': string;
  'message.prenotify': string;
  'message.action.subscribed': string;
  'message.action.subscribing': string;
  'message.action.resubscribed': string;
  'message.action.unsubscribed': string;
  'dialog.main.title': string;
  'dialog.main.button.subscribe': string;
  'dialog.main.button.unsubscribe': string;
  'dialog.blocked.title': string;
  'dialog.blocked.message': string;
}
//#endregion
//#region src/shared/outcomes/types.d.ts
interface OutcomesConfig {
  direct: {
    enabled: boolean;
  };
  indirect: {
    enabled: boolean;
    influencedTimePeriodMin: number;
    influencedNotificationsLimit: number;
  };
  unattributed: {
    enabled: boolean;
  };
}
//#endregion
//#region src/shared/config/types.d.ts
type NotificationClickMatchBehaviorValue = 'exact' | 'origin';
type NotificationClickActionBehaviorValue = 'navigate' | 'focus';
interface AppUserConfig {
  appId?: string;
  bell?: Partial<AppUserConfigNotifyButton>;
  autoRegister?: boolean;
  autoResubscribe?: boolean;
  path?: string;
  serviceWorkerPath?: string;
  serviceWorkerParam?: any;
  subdomainName?: string;
  promptOptions?: AppUserConfigPromptOptions;
  welcomeNotification?: AppUserConfigWelcomeNotification;
  notifyButton?: Partial<AppUserConfigNotifyButton>;
  persistNotification?: boolean;
  webhooks?: AppUserConfigWebhooks;
  notificationClickHandlerMatch?: NotificationClickMatchBehaviorValue;
  notificationClickHandlerAction?: NotificationClickActionBehaviorValue;
  pageUrl?: string;
  outcomes?: OutcomesConfig;
  serviceWorkerOverrideForTypical?: boolean;
  requiresUserPrivacyConsent?: boolean;
}
interface AppUserConfigWelcomeNotification {
  disable: boolean;
  title: string | undefined;
  message: string | undefined;
  url: string | undefined;
}
interface AppUserConfigNotifyButton {
  options?: AppUserConfigNotifyButton;
  enable: boolean;
  displayPredicate?: null | (() => void | null | undefined | boolean);
  size?: BellSize;
  position?: BellPosition;
  offset?: {
    bottom: string;
    left: string;
    right: string;
  };
  prenotify?: boolean;
  showCredit?: boolean;
  colors?: {
    'circle.background': string;
    'circle.foreground': string;
    'badge.background': string;
    'badge.foreground': string;
    'badge.bordercolor': string;
    'pulse.color': string;
    'dialog.button.background.hovering': string;
    'dialog.button.background.active': string;
    'dialog.button.background': string;
    'dialog.button.foreground': string;
  };
  text: BellText;
  theme?: string;
  showLauncherAfter?: number;
  showBadgeAfter?: number;
}
interface AppUserConfigWebhooks {
  cors: boolean | undefined;
  'notification.willDisplay': string | undefined;
  'notification.clicked': string | undefined;
  'notification.dismissed': string | undefined;
}
//#endregion
//#region src/page/managers/PromptsManager.d.ts
interface AutoPromptOptions {
  force?: boolean;
  forceSlidedownOverNative?: boolean;
  isInUpdateMode?: boolean;
  slidedownPromptOptions?: SlidedownPromptOptions;
}
//#endregion
//#region src/onesignal/OneSignalInterface.d.ts
interface OneSignalNotifications {
  readonly permission: boolean;
  readonly permissionNative: NotificationPermission | undefined;
  addEventListener<K extends keyof NotificationEventTypeMap>(event: K, listener: (event: NotificationEventTypeMap[K]) => void): void;
  isPushSupported(): boolean;
  removeEventListener<K extends keyof NotificationEventTypeMap>(event: K, listener: (event: NotificationEventTypeMap[K]) => void): void;
  requestPermission(): Promise<boolean>;
  setDefaultTitle(title: string): Promise<void>;
  setDefaultUrl(url: string): Promise<void>;
}
interface OneSignalSlidedown {
  addEventListener(event: 'slidedownShown', listener: (wasShown: boolean) => void): void;
  promptEmail(options?: AutoPromptOptions): Promise<void>;
  promptPush(options?: AutoPromptOptions): Promise<void>;
  promptPushCategories(options?: AutoPromptOptions): Promise<void>;
  promptSms(options?: AutoPromptOptions): Promise<void>;
  promptSmsAndEmail(options?: AutoPromptOptions): Promise<void>;
  removeEventListener(event: 'slidedownShown', listener: (wasShown: boolean) => void): void;
}
interface OneSignalSession {
  sendOutcome(outcomeName: string, outcomeWeight?: number): Promise<void>;
  sendUniqueOutcome(outcomeName: string): Promise<void>;
}
interface PushSubscriptionProperties {
  id: string | null | undefined;
  optedIn: boolean;
  token: string | null | undefined;
}
interface SubscriptionChangeEvent {
  current: PushSubscriptionProperties;
  previous: PushSubscriptionProperties;
}
interface OneSignalPushSubscription {
  readonly id: string | null | undefined;
  readonly optedIn: boolean;
  readonly token: string | null | undefined;
  addEventListener(event: 'change', listener: (change: SubscriptionChangeEvent) => void): void;
  optIn(): Promise<void>;
  optOut(): Promise<void>;
  removeEventListener(event: 'change', listener: (change: SubscriptionChangeEvent) => void): void;
}
interface UserChangeEvent {
  current: {
    externalId: string | undefined;
    onesignalId: string | undefined;
  };
}
interface OneSignalUser {
  readonly PushSubscription: OneSignalPushSubscription;
  readonly externalId: string | undefined;
  readonly onesignalId: string | undefined;
  addAlias(label: string, id: string): void;
  addAliases(aliases: Record<string, string>): void;
  addEmail(email: string): void;
  addEventListener(event: 'change', listener: (change: UserChangeEvent) => void): void;
  addSms(smsNumber: string): void;
  addTag(key: string, value: string): void;
  addTags(tags: Record<string, string>): void;
  getLanguage(): string;
  getTags(): Record<string, string>;
  removeAlias(label: string): void;
  removeAliases(labels: string[]): void;
  removeEmail(email: string): void;
  removeEventListener(event: 'change', listener: (change: UserChangeEvent) => void): void;
  removeSms(smsNumber: string): void;
  removeTag(key: string): void;
  removeTags(keys: string[]): void;
  setLanguage(language: string): void;
  trackEvent(name: string, properties?: Record<string, unknown>): void;
}
interface OneSignalDebug {
  setLogLevel(logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error'): void;
}
interface OneSignal {
  readonly Debug: OneSignalDebug;
  readonly Notifications: OneSignalNotifications;
  readonly Session: OneSignalSession;
  readonly Slidedown: OneSignalSlidedown;
  readonly User: OneSignalUser;
  init(options: AppUserConfig & {
    appId: string;
  }): Promise<void>;
  login(externalId: string, jwtToken?: string): Promise<void>;
  logout(): Promise<void>;
  setConsentGiven(consent: boolean): Promise<void>;
  setConsentRequired(requiresConsent: boolean): Promise<void>;
}
//#endregion
//#region types/entry.d.ts
declare global {
  interface Window {
    OneSignal: OneSignal;
    OneSignalDeferred?: ((oneSignal: OneSignal) => void | PromiseLike<void>)[];
  }
}
//#endregion
export type { OneSignal };