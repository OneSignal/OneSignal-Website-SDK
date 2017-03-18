import {Url} from "url";
import { Uuid } from "./Uuid";
import {NotificationActionButton} from "./NotificationActionButton";


export class Notification {
    public id: Uuid;
    public title: string;
    public body: string;
    public data: Map<string, any>;
    public url: Url;
    public icon: Url;
    public image: Url;
    public tag: string;
    public requireInteraction: boolean;
    public renotify: true;
    public buttons: Array<NotificationActionButton>;

    constructor(title: string, options?: any) {
        this.id = options.id;
        this.body = options.body;
        this.data = options.data;
        this.url = options.url;
        this.icon = options.icon;
        this.image = options.image;
        this.tag = options.tag
        this.requireInteraction = options.requireInteraction;
        this.renotify = options.renotify;
        this.buttons = options.buttons;
    }

    static createMock() {
        return new Notification("Mock notification title", {
            body: 'Mock notification body',
            icon: 'https://onesignal.com/images/notification_logo.png'
        })
    }
}