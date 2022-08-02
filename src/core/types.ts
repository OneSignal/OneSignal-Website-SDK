import { AppConfig } from "../shared/models/AppConfig";

export enum Model {
  Identity = "identity",
  Properties = "properties",
  Subscriptions = "subscriptions",
  Config = "config",
}

type User = any;

export type ObservableSlimChange = {
  type: "add" | "update" | "delete";
  property: string;
  currentPath: string;
  jsonPointer: string;
  target: any;
  proxy: ProxyConstructor;
  newValue: any;
  previousValue?: any;
};

export type Delta = {
  model: Model;
  property: string;
  newValue: object;
  timestamp: number;
};

export type Operation = {
  model: Model;
  delta: object;
  success?: boolean;
};

export type Request = {
  operation: Operation
  user: User;
  httpMethod: "POST" | "PUT" | "DELETE" | "GET"
};

export type RequestArgs = {
  action: string,
  data: object,
  headers?: Headers
};

export type Headers = any[] & {[key: string]: any};

export type DeltaAggregator = {
  [Model.Config]: AppConfig,
  [Model.Identity]: IdentityModel,
  [Model.Properties]: UserProperties,
  [Model.Subscriptions]: SubscriptionsModel[]
};

export type IdentityModel = {
  onesignal_id: string;
  external_id?: string;
  [key: string]: string | undefined;
};

export type UserProperties = {
  tags?: {[key: string]: string};
  language?: string;
  timezone_id?: string;
  lat?: number;
  long?: number;
  country?: string;
  first_active?: number;
  last_active?: number;
  ip?: string;
};

enum SubscriptionType {
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

export type SubscriptionsModel = {
  id: string;
  type: SubscriptionType;
  token?: string; // maps to legacy player.identifier
  enabled?: boolean;
  notification_types?: number;
  session_time?: number;
  session_counts?: number;
  sdk?: string;
  device_model?: string;
  device_os?: string;
  rooted?: boolean;
  test_type?: number;
  app_version?: string;
  net_type?: number;
  web_auth?: string;
  web_p256?: string;
};
