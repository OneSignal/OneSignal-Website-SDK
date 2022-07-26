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
