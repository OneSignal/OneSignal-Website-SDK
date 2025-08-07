declare module 'ServiceWorker' {
    // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
    var OneSignal: any;
    export = OneSignal;
}

interface PushSubscriptionChangeEvent extends ExtendableEvent {
    readonly oldSubscription: PushSubscription | null;
    readonly newSubscription: PushSubscription | null;
  }
  
/* eslint-disable no-var */
declare var PushSubscriptionChangeEvent: {
    prototype: PushSubscriptionChangeEvent;
    new(): PushSubscriptionChangeEvent;
};
/* eslint-enable no-var */
  