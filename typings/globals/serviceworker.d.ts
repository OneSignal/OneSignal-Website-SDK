declare module 'ServiceWorker' {
    var OneSignal: any;
    export = OneSignal;
}

interface PushSubscriptionChangeEvent extends ExtendableEvent {
  newSubscription: PushSubscription;
  oldSubscription: PushSubscription;
}
