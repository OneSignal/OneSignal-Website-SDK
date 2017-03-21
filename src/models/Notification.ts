import {Url} from "url";
import { Uuid } from "./Uuid";
import {NotificationActionButton} from "./NotificationActionButton";


export class Notification {
    public id: Uuid;
    public title: string;
    public body: string;
    public data: any;
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

    static createMock(
      title: string = "Mock notification title",
      body: string = 'Mock notification body',
      url: string = "https://onesignal.com?_osp=do_not_open",
      icon: string = "https://onesignal.com/images/notification_logo.png",
    ) {
        return new Notification(title, {
            icon: icon,
            body: body,
            url: url,
        })
    }
}