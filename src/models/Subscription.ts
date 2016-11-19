import {Uuid} from "./Uuid";
import {Url} from "url";


class Subscription {
    deviceId: Uuid;
    endpoint: Url;
    token: string;
}

export { Subscription };