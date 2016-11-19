import {Url} from "url";
import Serializable from "../Serializable";
import { Uuid } from "./Uuid";


interface Notification extends Serializable {
    id: Uuid,
    heading: string,
    content: string,
    data: Map<string, any>,
    url: Url,
    icon: Url
}

export { Notification };