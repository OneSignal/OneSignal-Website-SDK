
export type SupportedSubscription = SubscriptionModel | FutureSubscriptionModel;

export enum SubscriptionType {
  iOS = "iOS",
  Android = "Android",
  FireOS = "FireOS",
  ChromeExtension = "ChromeExtension",
  ChromePush = "ChromePush",
  WindowPush = "WindowPush",
  SafariPush = "SafariPush",
  SafariLegacyPush = "SafariLegacyPush",
  FirefoxPush = "FirefoxPush",
  HuaweiPush = "HuaweiPush",
  macOSPush = "macOSPush",
  AlexaPush = "AlexaPush",
  Email = "Email",
  SMS = "SMS",
}

export interface FutureSubscriptionModel {
  type: SubscriptionType;
  token?: string; // maps to legacy player.identifier
  enabled?: boolean;
  notification_types?: number;
  sdk?: string;
  device_model?: string;
  device_os?: string;
  rooted?: boolean;
  test_type?: number;
  app_version?: string;
  net_type?: number;
  web_auth?: string;
  web_p256?: string;
}

export interface SubscriptionModel extends FutureSubscriptionModel {
  id: string;
}
