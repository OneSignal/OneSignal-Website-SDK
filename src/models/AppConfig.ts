import { Uuid } from './Uuid';
import { Serializable } from './Serializable';

export class AppConfig implements Serializable {
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
   * Describes whether the subdomain HTTP users subscribe to should belong to
   * the legacy domain onesignal.com, or the newer domain os.tc.
   */
  httpUseOneSignalCom?: boolean;
  cookieSyncEnabled?: boolean;
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

  serialize(): object {
    return {
      appId: this.appId.serialize(),
      subdomain: this.subdomain,
      httpUseOneSignalCom: this.httpUseOneSignalCom,
      cookieSyncEnabled: this.cookieSyncEnabled,
      safariWebId: this.safariWebId,
      vapidPublicKey: this.vapidPublicKey,
      userConfig: this.userConfig
    };
  }

  static deserialize(bundle: any): AppConfig {
    const appConfig = new AppConfig();
    appConfig.appId = Uuid.deserialize(bundle.appId);
    appConfig.subdomain = bundle.subdomain;
    appConfig.httpUseOneSignalCom = bundle.httpUseOneSignalCom;
    appConfig.cookieSyncEnabled = bundle.cookieSyncEnabled;
    appConfig.safariWebId = bundle.safariWebId;
    appConfig.vapidPublicKey = bundle.vapidPublicKey;
    appConfig.userConfig = bundle.userConfig;
    return appConfig;
  }
}

export interface AppUserConfig {
  appId?: string;
  autoRegister?: boolean;
  path?: string;
  serviceWorkerPath?: string;
  serviceWorkerUpdaterPath?: string;
  serviceWorkerParam?: any;
  subdomainName?: string;
  httpPermissionRequest?: AppUserConfigHttpPermissionRequest;
  promptOptions?: AppUserConfigPromptOptions;
  welcomeNotification?: AppUserConfigWelcomeNotification;
  notifyButton?: AppUserConfigNotifyButton;
  persistNotification?: boolean;
  webhooks?: AppUserConfigWebhooks;
  notificationClickHandlerMatch?: object;
  notificationClickHandlerAction?: object;
  allowLocalhostAsSecureOrigin?: boolean;
}

export interface AppUserConfigHttpPermissionRequest {
  enable: boolean;
  useCustomModal: boolean;
  modalTitle: string;
  modalMessage: string;
  modalButtonText: string;
}

export interface AppUserConfigPromptOptions {
  subscribeText: string;
  showGraphic: boolean;
  timeout: number;
  autoAcceptTitle: string;
  actionMessage: string;
  exampleNotificationTitleDesktop: string;
  exampleNotificationMessageDesktop: string;
  exampleNotificationTitleMobile: string;
  exampleNotificationMessageMobile: string;
  exampleNotificationCaption: string;
  acceptButtonText: string;
  cancelButtonText: string;
  showCredit: string;
}

export interface AppUserConfigWelcomeNotification {
  disable: boolean;
  title: string;
  message: string;
}

export interface AppUserConfigNotifyButton {
  enable: boolean;
  displayPredicate: Function;
  size: 'small' | 'medium' | 'large';
  position: 'bottom-left' | 'bottom-right';
  offset: { bottom: number; left: number; right: number };
  modalPrompt: boolean;
  prenotify: boolean;
  showCredit: boolean;
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
}

export interface ServerAppConfig {
  success: boolean;
  app_id: string;
  features: {
    cookie_sync: {
      enable: boolean;
    };
  };
  config: {
    vapid_public_key: string;
    http_use_onesignal_com: boolean;
    safari_web_id: string;
    subdomain: string;
  };
  generated_at: number;
}
