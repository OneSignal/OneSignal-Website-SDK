import {Url} from "url";
import { Uuid } from "./Uuid";


interface Notification {
    id: Uuid,
    heading: string,
    content: string,
    data: Map<string, any>,
    url: Url,
    icon: Url,
    buttons: Array<{action: string, title: string, icon: string, url: string}>
}

export { Notification };