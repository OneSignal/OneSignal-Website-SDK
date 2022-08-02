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
  operationId: string; // unique id for this operation uuidv4
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
  [Model.Config]: {[key: string]: any},
  [Model.Identity]: {[key: string]: any},
  [Model.Properties]: {[key: string]: any},
  [Model.Subscriptions]: {[key: string]: any}
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
