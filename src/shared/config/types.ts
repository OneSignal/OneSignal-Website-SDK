import type { OutcomesConfig, OutcomesServerConfig } from '../outcomes/types';
import type {
  AppUserConfigPromptOptions,
  BellPosition,
  BellSize,
  BellText,
  ServerAppPromptConfig,
} from '../prompts/types';
import type {
  ConfigIntegrationKind,
  NotificationClickActionBehavior,
  NotificationClickMatchBehavior,
} from './constants';

type NotificationClickMatchBehaviorValue =
  (typeof NotificationClickMatchBehavior)[keyof typeof NotificationClickMatchBehavior];

type NotificationClickActionBehaviorValue =
  (typeof NotificationClickActionBehavior)[keyof typeof NotificationClickActionBehavior];

export type ConfigIntegrationKindValue =
  (typeof ConfigIntegrationKind)[keyof typeof ConfigIntegrationKind];

// app config
export interface AppConfig {
  /**
   * The OneSignal dashboard app ID. Although this value is provided, it isn't
   * used since it will always be identical to the provided app ID.
   */
  appId: string;

  /**
   * Is the app configured for a subdomain (AKA os.tc) that
   * is no longer supported by OneSignal.
   */
  hasUnsupportedSubdomain: boolean;

  /**
   * The allowed origin this web push config is allowed to run on.
   */
  origin: string;

  restrictedOriginEnabled?: boolean | null;
  enableOnSession?: boolean;
  enableSessionDuration?: boolean;
  safariWebId?: string;

  /**
   * Chrome and Chrome-like browsers including Opera and Yandex use VAPID for
   * authentication, and so each app uses a uniquely generated key.
   */
  vapidPublicKey?: string;

  /**
   * Firefox uses VAPID for application identification instead of
   * authentication, and so all apps share an identification key.
   */
  onesignalVapidPublicKey?: string;

  userConfig: AppUserConfig;
  // TODO: Cleanup: pageUrl is also on AppUserConfig
  pageUrl?: string;
  sessionThreshold?: number;

  siteName: string;
}

export interface AppUserConfig {
  [key: string]: any;
  appId?: string;
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
}

export interface AppUserConfigWelcomeNotification {
  disable: boolean;
  title: string | undefined;
  message: string | undefined;
  url: string | undefined;
}

export interface AppUserConfigNotifyButton {
  options?: AppUserConfigNotifyButton;
  enable: boolean;
  displayPredicate?: null | (() => void | null | undefined | boolean);
  size?: BellSize;
  position?: BellPosition;
  offset?: { bottom: string; left: string; right: string };
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

export interface AppUserConfigWebhooks {
  cors: boolean | undefined;
  'notification.willDisplay': string | undefined;
  'notification.clicked': string | undefined;
  'notification.dismissed': string | undefined;
}

// server app config
export interface ServerAppConfig {
  success: boolean;
  app_id: string;
  version: number;
  features: {
    metrics: {
      enable: boolean;
      mixpanel_reporting_token: string;
    };
    restrict_origin: {
      enable: boolean;
    };
    enable_on_session?: boolean;
    receive_receipts_enable?: boolean;
    web_on_focus_enabled: boolean;
    session_threshold: number;
  };
  config: {
    /**
     * The allowed origin this web push config is allowed to run on.
     */
    // TODO: origin and siteInfo.proxyOrigin are the same, clean up mixed usage in code
    origin: string;
    staticPrompts: ServerAppPromptConfig;
    autoResubscribe: boolean;
    siteInfo: {
      name: string;
      origin: string;
      proxyOrigin: string | undefined;
      defaultIconUrl: string | null;
      proxyOriginEnabled: boolean;
    };
    webhooks: {
      enable: boolean;
      corsEnable?: boolean;
      notificationClickedHook?: string;
      notificationDismissedHook?: string;
      notificationDisplayedHook?: string;
    };
    integration: {
      kind: ConfigIntegrationKindValue;
    };
    serviceWorker: {
      path?: string;
      workerName?: string;
      registrationScope?: string;
    };
    setupBehavior?: Record<string, unknown>;
    welcomeNotification: {
      url: string | undefined;
      title: string | undefined;
      enable: boolean;
      message: string | undefined;
      urlEnabled: boolean | undefined;
    };
    notificationBehavior?: {
      click: {
        match: NotificationClickMatchBehaviorValue;
        action: NotificationClickActionBehaviorValue;
      };
      display: {
        persist: boolean;
      };
    };
    outcomes: OutcomesServerConfig;
    vapid_public_key: string;
    onesignal_vapid_public_key: string;
    http_use_onesignal_com?: boolean;
    safari_web_id?: string;
    subdomain: string | undefined;
  };

  generated_at: number;
}

export type ServiceWorkerConfigParams = {
  path?: string;
  serviceWorkerParam?: { scope: string };
  serviceWorkerPath?: string;
};
