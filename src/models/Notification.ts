import {Url} from "url";
import { Uuid } from "./Uuid";
import {NotificationActionButton} from "./NotificationActionButton";


interface Notification {
    id: Uuid,
    heading: string,
    content: string,
    data: Map<string, any>,
    url: Url,
    icon: Url,
    buttons: Array<NotificationActionButton>
}

export { Notification };