export enum Model {
  Identity = "identity",
  Properties = "properties",
  Subscriptions = "subscriptions",
  Config = "config",
  Session = "session"
}

export type Delta = {
  model: Model;
  property: string;
  newValue: object;
  timestamp: number;
};

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

export interface SessionModel {
  [key: string]: any;
}
export interface IdentityModel {
  [key: string]: any;
}
export interface PropertiesModel {
  [key: string]: any;
}
export interface SubscriptionsModel {
  [key: string]: any;
}

export interface ConfigModel {
  [key: string]: any;
}

export type RequestArgs = {
  action: string,
  data: object,
  headers?: Headers
};

export type Headers = any[] & {[key: string]: any};