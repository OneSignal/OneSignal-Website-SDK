declare module "OneSignal" {
    export type on = any;
    export var on: any;
    export var emit: any;
}

interface SetEmailOptions {
  identifierAuthHash?: string;
  emailAuthHash?: string; // backwards compatibility
}

interface PushSubscriptionState {
  subscribed: boolean;
  optedOut: boolean;
}
