declare module 'ServiceWorker' {
    var OneSignal: any;
    export = OneSignal;
}

interface PushSubscriptionChangeEvent extends ExtendableEvent {
    readonly newSubscription: PushSubscription | null;
    readonly oldSubscription: PushSubscription | null;
}

declare var PushSubscriptionChangeEvent: {
    prototype: PushSubscriptionChangeEvent;
    new(type: string, eventInitDict?: PushSubscriptionChangeEventInit): PushSubscriptionChangeEvent;
};

interface PushSubscriptionChangeEventInit extends ExtendableEventInit {
    newSubscription?: PushSubscription;
    oldSubscription?: PushSubscription;
}
