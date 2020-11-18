import { OutcomesConfig, OutcomesServerConfig } from "./Outcomes";
import {
  AppUserConfigPromptOptions,
  CustomLinkStyle,
  CustomLinkSize,
  AppUserConfigNotifyButton
} from './Prompts';
import { Categories } from "../models/Tags";

export interface AppConfig {
  /**
   * The OneSignal dashboard app ID. Although this value is provided, it isn't
   * used since it will always be identical to the provided app ID.
   */
  appId: string;

  /**
   * The subdomain chosen on the dashboard for non-HTTPS apps.
   */
  subdomain?: string;

  /**
   * The allowed origin this web push config is allowed to run on.
   */
  origin: string;

  /**
   * Describes whether the subdomain HTTP users subscribe to should belong to
   * the legacy domain onesignal.com, or the newer domain os.tc.
   */
  httpUseOneSignalCom?: boolean;
  restrictedOriginEnabled?: boolean | null;
  metrics: {
    enable: boolean;
    mixpanelReportingToken: string | null;
  };
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

  /**
   * Describes whether Confirmed Delivery should be active
   */
  receiveReceiptsEnable?: boolean;
  sessionThreshold?: number;

  siteName: string;
}

export enum ConfigIntegrationKind {
  TypicalSite = 'typical',
  WordPress = 'wordpress',
  Shopify = 'shopify',
  Blogger = 'blogger',
  Magento = 'magento',
  Drupal = 'drupal',
  SquareSpace = 'squarespace',
  Joomla = 'joomla',
  Weebly = 'weebly',
  Wix = "wix",
  Custom = 'custom',
}

export enum NotificationClickMatchBehavior {
  Exact = 'exact',
  Origin = 'origin'
}

export enum NotificationClickActionBehavior {
  Navigate = 'navigate',
  Focus = 'focus'
}

export interface AppUserConfig {
  [key: string]: any;
  appId?: string;
  autoRegister?: boolean;
  autoResubscribe?: boolean;
  path?: string;
  serviceWorkerPath?: string;
  serviceWorkerUpdaterPath?: string;
  serviceWorkerParam?: any;
  subdomainName?: string;
  promptOptions?: AppUserConfigPromptOptions;
  welcomeNotification?: AppUserConfigWelcomeNotification;
  notifyButton?: Partial<AppUserConfigNotifyButton>;
  persistNotification?: boolean;
  webhooks?: AppUserConfigWebhooks;
  notificationClickHandlerMatch?: NotificationClickMatchBehavior;
  notificationClickHandlerAction?: NotificationClickActionBehavior;
  allowLocalhostAsSecureOrigin?: boolean;
  requiresUserPrivacyConsent?: boolean;
  pageUrl?: string;
  outcomes?: OutcomesConfig;
}

export interface AppUserConfigWelcomeNotification {
  disable: boolean;
  title: string | undefined;
  message: string | undefined;
  url: string | undefined;
}

export interface AppUserConfigWebhooks {
  cors: boolean | undefined;
  'notification.displayed': string | undefined;
  'notification.clicked': string | undefined;
  'notification.dismissed': string | undefined;
}

export interface ServerAppConfigPrompt {
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
  slidedown: {
    enabled: boolean;
    autoPrompt: boolean;
    pageViews?: number;
    timeDelay?: number;
    acceptButton: string;
    cancelButton: string;
    actionMessage: string;
    customizeTextEnabled: boolean;
    categories?: Categories;
  };
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
    }
    color: {
      button: string;
      text: string;
    }
  };
}

export interface ServerAppConfig {
  success: boolean;
  app_id: string;
  features: {
    metrics: {
      enable: boolean;
      mixpanel_reporting_token: string;
    };
    restrict_origin: {
      enable: boolean;
    };
    email?: {
      require_auth: boolean;
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
    staticPrompts: ServerAppConfigPrompt;
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
      kind: ConfigIntegrationKind;
    };
    serviceWorker: {
      path?: string;
      workerName?: string;
      registrationScope?: string;
      updaterWorkerName?: string;
      customizationEnabled: boolean;
    };
    setupBehavior?: {
      allowLocalhostAsSecureOrigin: false;
    };
    welcomeNotification: {
      url: string | undefined;
      title: string | undefined;
      enable: boolean;
      message: string | undefined;
      urlEnabled: boolean| undefined;
    };
    notificationBehavior?: {
      click: {
        match: NotificationClickMatchBehavior;
        action: NotificationClickActionBehavior;
      };
      display: {
        persist: boolean;
      };
    };
    outcomes: OutcomesServerConfig,
    vapid_public_key: string;
    onesignal_vapid_public_key: string;
    http_use_onesignal_com?: boolean;
    safari_web_id?: string;
    subdomain: string| undefined;
  };

  generated_at: number;
}
