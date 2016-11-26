import {Uuid} from "./Uuid";


export class Subscription {
    /**
     * The OneSignal player ID.
     */
    deviceId: Uuid;
    /**
     * The GCM/FCM registration token, along with the full URL.
     */
    pushEndpoint: URL;
    /**
     * The GCM/FCM registration token, just the token part.
     */
    pushToken: string;
    /**
     * Whether the user is opted out of notifications, set by setSubscription().
     */
    optedOut: boolean;
}