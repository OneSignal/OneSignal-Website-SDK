export enum Model {
  Identity = "identity",
  Properties = "properties",
  Subscriptions = "subscriptions",
  Config = "config",
  Session = "session"
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

export interface IdentityModel {}

export interface SessionModel {
  foo?: string;
  hello?: string;
  arr?: string[];
  [key: string]: any;
}
export interface IdentityModel {
  foo?: string;
  hello?: string;
  arr?: string[];
  [key: string]: any;
}
export interface PropertiesModel {
  foo?: string;
  hello?: string;
  arr?: string[];
  [key: string]: any;
}
export interface SubscriptionsModel {
  foo?: string;
  hello?: string;
  arr?: string[];
  [key: string]: any;
}

export interface ConfigModel {
  foo?: string;
  hello?: string;
  arr?: string[];
  [key: string]: any;
}

export type RequestArgs = {
  action: string,
  data: object,
  headers?: Headers
};

export type Headers = any[] & {[key: string]: any};

export type DeltaAggregator = {
  [Model.Config]: ConfigModel,
  [Model.Identity]: IdentityModel,
  [Model.Properties]: PropertiesModel,
  [Model.Session]: SessionModel,
  [Model.Subscriptions]: SubscriptionsModel
};

export type IdentityObject = {
  onesignal_id: string;
  external_id?: string;
  [key: string]: string | undefined;
};

export type PropertiesObject = {
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

type SubscriptionsObject = {
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
