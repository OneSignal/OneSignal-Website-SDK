import {Uuid} from "./Uuid";


export class Subscription {
    /**
     * The OneSignal player ID.
     */
    deviceId: Uuid;
    /**
     * The GCM/FCM registration token, along with the full URL.
     */
    endpoint: URL;
    /**
     * The GCM/FCM registration token, just the token part.
     */
    token: string;
}