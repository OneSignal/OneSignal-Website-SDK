import type { AutoPromptOptions } from 'src/page/managers/PromptsManager';
import type { AppUserConfig } from 'src/shared/config/types';
import type { NotificationEventTypeMap } from 'src/shared/notifications/types';

export interface OneSignalNotifications {
  readonly permission: boolean;
  readonly permissionNative: NotificationPermission | undefined;
  addEventListener<K extends keyof NotificationEventTypeMap>(
    event: K,
    listener: (event: NotificationEventTypeMap[K]) => void,
  ): void;
  isPushSupported(): boolean;
  removeEventListener<K extends keyof NotificationEventTypeMap>(
    event: K,
    listener: (event: NotificationEventTypeMap[K]) => void,
  ): void;
  requestPermission(): Promise<boolean>;
  setDefaultTitle(title: string): Promise<void>;
  setDefaultUrl(url: string): Promise<void>;
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
  init(options: AppUserConfig & { appId: string }): Promise<void>;
  login(externalId: string, jwtToken?: string): Promise<void>;
  logout(): Promise<void>;
  setConsentGiven(consent: boolean): Promise<void>;
  setConsentRequired(requiresConsent: boolean): Promise<void>;
}
