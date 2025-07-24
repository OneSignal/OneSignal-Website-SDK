import type { Categories } from '../../page/models/Tags';
import type { OutcomesConfig, OutcomesServerConfig } from './Outcomes';
import type {
  AppUserConfigNotifyButton,
  AppUserConfigPromptOptions,
  CustomLinkSize,
  CustomLinkStyle,
  SlidedownOptions,
} from './Prompts';

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

export const ConfigIntegrationKind = {
  TypicalSite: 'typical',
  WordPress: 'wordpress',
  Shopify: 'shopify',
  Blogger: 'blogger',
  Magento: 'magento',
  Drupal: 'drupal',
  SquareSpace: 'squarespace',
  Joomla: 'joomla',
  Weebly: 'weebly',
  Wix: 'wix',
  Custom: 'custom',
} as const;

export type ConfigIntegrationKindValue =
  (typeof ConfigIntegrationKind)[keyof typeof ConfigIntegrationKind];

export const NotificationClickMatchBehavior = {
  Exact: 'exact',
  Origin: 'origin',
} as const;
type NotificationClickMatchBehaviorValue =
  (typeof NotificationClickMatchBehavior)[keyof typeof NotificationClickMatchBehavior];

export const NotificationClickActionBehavior = {
  Navigate: 'navigate',
  Focus: 'focus',
} as const;
type NotificationClickActionBehaviorValue =
  (typeof NotificationClickActionBehavior)[keyof typeof NotificationClickActionBehavior];

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

export interface AppUserConfigWebhooks {
  cors: boolean | undefined;
  'notification.willDisplay': string | undefined;
  'notification.clicked': string | undefined;
  'notification.dismissed': string | undefined;
}

// deprecated. TO DO: remove after server config version 2 fully migrated
export interface SlidedownOptionsVersion1 {
  enabled: boolean;
  autoPrompt: boolean;
  pageViews?: number;
  timeDelay?: number;
  acceptButtonText?: string;
  acceptButton?: string;
  cancelButtonText?: string;
  cancelButton?: string;
  actionMessage: string;
  customizeTextEnabled: boolean;
  categories?: Categories;
}

export interface ServerAppPromptConfig {
  native: {
    enabled: boolean;
    autoPrompt: boolean;
    pageViews?: number;
    timeDelay?: number;
  };
  bell: {
    enabled: boolean;
    size: 'small' | 'medium' | 'large';
    color: {
      main: string;
      accent: string;
    };
    dialog: {
      main: {
        title: string;
        subscribeButton: string;
        unsubscribeButton: string;
      };
      blocked: {
        title: string;
        message: string;
      };
    };
    offset: {
      left: number;
      right: number;
      bottom: number;
    };
    message: {
      subscribing: string;
      unsubscribing: string;
    };
    tooltip: {
      blocked: string;
      subscribed: string;
      unsubscribed: string;
    };
    location: 'bottom-left' | 'bottom-right';
    hideWhenSubscribed: boolean;
    customizeTextEnabled: boolean;
  };
  slidedown: SlidedownOptions;
  fullscreen: {
    title: string;
    caption: string;
    enabled: boolean;
    message: string;
    acceptButton: string;
    cancelButton: string;
    actionMessage: string;
    autoAcceptTitle: string;
    customizeTextEnabled: boolean;
  };
  customlink: {
    enabled: boolean;
    style: CustomLinkStyle;
    size: CustomLinkSize;
    unsubscribeEnabled: boolean;
    text: {
      explanation: string;
      subscribe: string;
      unsubscribe: string;
    };
    color: {
      button: string;
      text: string;
    };
  };
}

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
    setupBehavior?: {};
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
