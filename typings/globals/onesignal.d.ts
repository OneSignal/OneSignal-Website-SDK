declare module "OneSignal" {
    export type on = any;
    export var on: any;
    export var emit: any;
}

interface SetEmailOptions {
  identifierAuthHash?: string;
}

interface PushSubscriptionState {
  subscribed: boolean;
  optedOut: boolean;
}
