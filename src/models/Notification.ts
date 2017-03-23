import {Url} from "url";
import { Uuid } from "./Uuid";
import {NotificationActionButton} from "./NotificationActionButton";
import { trimUndefined } from '../utils';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';


export class Notification {
    public id?: Uuid;
    public title?: string;
    public body?: string;
    public data?: any;
    public url?: string;
    public icon?: string;
    public image?: string;
    public tag?: string;
    public requireInteraction?: boolean;
    public renotify?: true;
    public buttons?: Array<NotificationActionButton>;

    constructor(title: string, options?: Notification) {
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

    static createFromPushPayload(payload: any): Notification {
        if (!payload) {
            throw new InvalidArgumentError('payload', InvalidArgumentReason.Empty);
        }
        const notification = new Notification(payload.title, {
            id: payload.custom.i,
            title: payload.title,
            body: payload.alert,
            data: payload.custom.a,
            url: payload.custom.u,
            icon: payload.icon,
            tag: payload.tag
        });

        // Add action buttons
        if (payload.o) {
            notification.buttons = [];
            for (let rawButton of payload.o) {
                notification.buttons.push({
                    action: rawButton.i,
                    title: rawButton.n,
                    icon: rawButton.p,
                    url: rawButton.u
                });
            }
        }
        return trimUndefined(notification);
    }
}