interface OneSignalInitOptions {
  appId: string;
  autoRegister?: boolean;
  autoResubscribe?: boolean;
  notificationClickHandlerAction?: 'navigate' | 'focus';
  notificationClickHandlerMatch?: 'exact' | 'origin';
  path?: string;
  persistNotification?: boolean;
  requiresUserPrivacyConsent?: boolean;
  safari_web_id?: string;
  serviceWorkerOverrideForTypical?: boolean;
  serviceWorkerParam?: { scope: string };
  serviceWorkerPath?: string;
  subdomainName?: string;
}

interface Notification {
  readonly actionButtons?: {
    readonly actionId: string;
    readonly icon?: string;
    readonly launchURL?: string;
    readonly text: string;
  }[];
  readonly additionalData?: object;
  readonly badgeIcon?: string;
  readonly body: string;
  readonly confirmDelivery: boolean;
  readonly icon?: string;
  readonly image?: string;
  readonly launchURL?: string;
  readonly notificationId: string;
  readonly title?: string;
  readonly topic?: string;
}

interface NotificationEventMap {
  click: {
    readonly notification: Notification;
    readonly result: {
      readonly actionId?: string;
      readonly url?: string;
    };
  };
  dismiss: {
    notification: Notification;
  };
  foregroundWillDisplay: {
    readonly notification: Notification & {
      display(): void;
    };
    preventDefault(): void;
  };
  permissionChange: boolean;
  permissionPromptDisplay: void;
}

export interface OneSignalNotifications {
  readonly permission: boolean;
  readonly permissionNative: NotificationPermission | undefined;
  addEventListener<K extends keyof NotificationEventMap>(
    event: K,
    listener: (event: NotificationEventMap[K]) => void,
  ): void;
  isPushSupported(): boolean;
  removeEventListener<K extends keyof NotificationEventMap>(
    event: K,
    listener: (event: NotificationEventMap[K]) => void,
  ): void;
  requestPermission(): Promise<boolean>;
  setDefaultTitle(title: string): Promise<void>;
  setDefaultUrl(url: string): Promise<void>;
}

interface SlidedownPromptOptions {
  autoPrompt: boolean;
  categories?: {
    checked?: boolean;
    label: string;
    tag: string;
  }[];
  delay?: {
    pageViews: number;
    timeDelay: number;
  };
  icon?: string | null;
  text: {
    acceptButton: string;
    actionMessage: string;
    cancelButton: string;
    confirmMessage?: string;
    emailLabel?: string;
    negativeUpdateButton?: string;
    positiveUpdateButton?: string;
    smsLabel?: string;
    updateMessage?: string;
  };
  type: 'push' | 'category' | 'sms' | 'email' | 'smsAndEmail';
}

interface AutoPromptOptions {
  force?: boolean;
  forceSlidedownOverNative?: boolean;
  isInUpdateMode?: boolean;
  slidedownPromptOptions?: SlidedownPromptOptions;
}

export interface OneSignalSlidedown {
  addEventListener(event: 'slidedownShown', listener: (wasShown: boolean) => void): void;
  promptEmail(options?: AutoPromptOptions): Promise<void>;
  promptPush(options?: AutoPromptOptions): Promise<void>;
  promptPushCategories(options?: AutoPromptOptions): Promise<void>;
  promptSms(options?: AutoPromptOptions): Promise<void>;
  promptSmsAndEmail(options?: AutoPromptOptions): Promise<void>;
  removeEventListener(event: 'slidedownShown', listener: (wasShown: boolean) => void): void;
}

export interface OneSignalSession {
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

export interface OneSignalPushSubscription {
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

export interface OneSignalUser {
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

export interface OneSignalDebug {
  setLogLevel(logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error'): void;
}

export interface OneSignal {
  readonly Debug: OneSignalDebug;
  readonly Notifications: OneSignalNotifications;
  readonly Session: OneSignalSession;
  readonly Slidedown: OneSignalSlidedown;
  readonly User: OneSignalUser;
  init(options: OneSignalInitOptions): Promise<void>;
  login(externalId: string, jwtToken?: string): Promise<void>;
  logout(): Promise<void>;
  setConsentGiven(consent: boolean): Promise<void>;
  setConsentRequired(requiresConsent: boolean): Promise<void>;
}
