import { Uuid } from './Uuid';
import { Serializable } from './Serializable';
import { SlidedownPermissionMessageOptions } from '../popover/Popover';

export interface AppConfig {
  /**
   * The OneSignal dashboard app ID. Although this value is provided, it isn't
   * used since it will always be identical to the provided app ID.
   */
  appId: Uuid;
  /**
   * The subdomain chosen on the dashboard for non-HTTPS apps.
   */
  subdomain: string;
  /**
   * The allowed origin this web push config is allowed to run on.
   */
  origin: string;
  /**
   * Describes whether the subdomain HTTP users subscribe to should belong to
   * the legacy domain onesignal.com, or the newer domain os.tc.
   */
  httpUseOneSignalCom?: boolean;
  cookieSyncEnabled?: boolean;
  restrictedOriginEnabled?: boolean;
  metrics: {
    enable: boolean;
    mixpanelReportingToken: string;
  };

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
  userConfig?: AppUserConfig;
}

export function serializeAppConfig(config: AppConfig): object {
  return {
    appId: config.appId.serialize(),
    subdomain: config.subdomain,
    httpUseOneSignalCom: config.httpUseOneSignalCom,
    cookieSyncEnabled: config.cookieSyncEnabled,
    safariWebId: config.safariWebId,
    vapidPublicKey: config.vapidPublicKey,
    userConfig: config.userConfig
  };
}

export function deserializeAppConfig(bundle: any): AppConfig {
  return {
    appId: Uuid.deserialize(bundle.appId),
    subdomain: bundle.subdomain,
    httpUseOneSignalCom: bundle.httpUseOneSignalCom,
    cookieSyncEnabled: bundle.cookieSyncEnabled,
    safariWebId: bundle.safariWebId,
    vapidPublicKey: bundle.vapidPublicKey,
    userConfig: bundle.userConfig,
  } as AppConfig;
}

export enum IntegrationKind {
  TypicalSite = 'typical',
  WordPress = 'wordpress',
  Custom = 'custom'
}

export enum NotificationClickMatchBehavior {
  Exact = 'exact',
  Origin = 'origin'
}

export enum NotificationClickActionBehavior {
  Navigate = 'navigate',
  Focus = 'focus'
}

export interface WebConfig {
  siteInfo: {
    name: string;
    origin: string;
    proxyOrigin: string | null;
    defaultIconUrl: string | null;
    proxyOriginEnabled: boolean;
  };
  webhooks: {
    enable: boolean;
    corsEnable: false;
    notificationClickedHook: string;
    notificationDismissedHook: string;
    notificationDisplayedHook: string;
  };
  integration: {
    kind: IntegrationKind;
  };
  serviceWorker: {
    path: string;
    workerName: string;
    updaterWorkerName: string;
    registrationScope: string;
    customizationEnabled: boolean;
  };
  setupBehavior: {
    allowLocalhostAsSecureOrigin: boolean;
  };
  welcomeNotification: {
    url: string;
    title: string;
    enable: boolean;
    message: string;
    urlEnabled: boolean;
  };
  notificationBehavior: {
    click: {
      match: NotificationClickMatchBehavior;
      action: NotificationClickActionBehavior;
    };
    display: {
      persist: boolean;
    };
  };
}

export interface AppUserConfig {
  appId?: string;
  autoRegister?: boolean;
  path?: string;
  serviceWorkerPath?: string;
  serviceWorkerUpdaterPath?: string;
  serviceWorkerParam?: any;
  subdomainName?: string;
  promptOptions?: AppUserConfigPromptOptions;
  welcomeNotification?: AppUserConfigWelcomeNotification;
  notifyButton?: AppUserConfigNotifyButton;
  persistNotification?: boolean;
  webhooks?: AppUserConfigWebhooks;
  notificationClickHandlerMatch?: NotificationClickMatchBehavior;
  notificationClickHandlerAction?: NotificationClickActionBehavior;
  allowLocalhostAsSecureOrigin?: boolean;
}

export interface FullscreenPermissionMessageOptions {
  autoAcceptTitle?: string;
  actionMessage: string;
  acceptButton: string;
  cancelButton: string;
  title: string;
  message: string;
  caption: string;
}

export interface AppUserConfigPromptOptions {
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
  acceptButtonText?: string;
  cancelButtonText?: string;
  showCredit?: string;
  slidedown?: SlidedownPermissionMessageOptions;
  fullscreen?: FullscreenPermissionMessageOptions;
}

export interface AppUserConfigWelcomeNotification {
  disable: boolean;
  title: string;
  message: string;
  url: string;
}

export interface AppUserConfigNotifyButton {
  enable: boolean;
  displayPredicate: Function;
  size: 'small' | 'medium' | 'large';
  position: 'bottom-left' | 'bottom-right';
  offset: { bottom: string; left: string; right: string };
  prenotify?: boolean;
  showCredit?: boolean;
  colors: {
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
  text: {
    'tip.state.unsubscribed': string;
    'tip.state.subscribed': string;
    'tip.state.blocked': string;
    'message.prenotify': string;
    'message.action.subscribed': string;
    'message.action.resubscribed': string;
    'message.action.unsubscribed': string;
    'dialog.main.title': string;
    'dialog.main.button.subscribe': string;
    'dialog.main.button.unsubscribe': string;
    'dialog.blocked.title': string;
    'dialog.blocked.message': string;
  };
}

export interface AppUserConfigWebhooks {
  cors: boolean;
  'notification.displayed': string;
  'notification.clicked': string;
  'notification.dismissed': string;
}

export interface ServerAppConfigPrompt {
  bell: {
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
    enabled: boolean;
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
    acceptButton: string;
    cancelButton: string;
    actionMessage: string;
    customizeTextEnabled: boolean;
  };
  fullscreen: {
    title: string;
    caption: string;
    enabled: boolean;
    message: string;
    acceptButton: string;
    cancelButton: string;
    actionMessage: string;
    customizeTextEnabled: boolean;
  };
}

export interface ServerAppConfig {
  success: boolean;
  app_id: string;
  features: {
    cookie_sync: {
      enable: boolean;
    };
    metrics: {
      enable: boolean;
      mixpanel_reporting_token: string;
    };
    restrict_origin: {
      enable: boolean;
    }
  };
  config: {
    staticPrompts: ServerAppConfigPrompt;
    siteInfo: {
      name: string;
      origin: string;
      proxyOrigin: string;
      defaultIconUrl: string;
      proxyOriginEnabled: boolean;
    };
    webhooks: {
      enable: boolean;
      corsEnable: boolean;
      notificationClickedHook: string;
      notificationDismissedHook: string;
      notificationDisplayedHook: string;
    };
    integration: {
      kind: IntegrationKind;
    };
    serviceWorker: {
      path: string;
      workerName: string;
      registrationScope: string;
      updaterWorkerName: string;
      customizationEnabled: boolean;
    };
    setupBehavior: {
      allowLocalhostAsSecureOrigin: false;
    };
    welcomeNotification: {
      url: string;
      title: string;
      enable: boolean;
      message: string;
      urlEnabled: boolean;
    };
    notificationBehavior: {
      click: {
        match: NotificationClickMatchBehavior;
        action: NotificationClickActionBehavior;
      };
      display: {
        persist: boolean;
      };
    };
    vapid_public_key: string;
    onesignal_vapid_public_key: string;
    http_use_onesignal_com: boolean;
    safari_web_id: string;
    subdomain: string;
  };

  generated_at: number;
}
