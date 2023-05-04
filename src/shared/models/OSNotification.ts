import Utils from '../context/Utils';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import { NotificationActionButton } from '../../page/models/NotificationActionButton';

export class OSNotification {
    public id?: string;
    public title?: string;
    public body?: string;
    public data?: any;
    public url?: string;
    public icon?: string;
    public image?: string;
    public tag?: string;
    public requireInteraction?: boolean;
    public renotify?: true;
    public actions?: Array<NotificationActionButton>;

    constructor(title: string, options?: OSNotification) {
      this.title = title;
      if (options) {
        this.id = options.id;
        this.body = options.body;
        this.data = options.data;
        this.url = options.url;
        this.icon = options.icon;
        this.image = options.image;
        this.tag = options.tag;
        this.requireInteraction = options.requireInteraction;
        this.renotify = options.renotify;
        this.actions = options.actions;
      }
    }

    static createMock({
      title = "Mock notification title",
      body = 'Mock notification body',
      url = "https://onesignal.com?_osp=do_not_open",
      icon = "https://onesignal.com/images/notification_logo.png",
      data = {}
    } = {}) {
        return new OSNotification(title, {
            icon: icon,
            body: body,
            url: url,
            data: data
        });
    }

    static createFromPushPayload(payload: any): OSNotification {
        if (!payload) {
            throw new InvalidArgumentError('payload', InvalidArgumentReason.Empty);
        }
        const notification = new OSNotification(payload.title, {
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
            notification.actions = [];
            for (const rawButton of payload.o) {
                notification.actions.push({
                    action: rawButton.i,
                    title: rawButton.n,
                    icon: rawButton.p,
                    url: rawButton.u
                });
            }
        }
        return Utils.trimUndefined(notification);
    }
}

export interface NotificationReceived {
    notificationId: string;
    appId: string;
    url: string;
    timestamp: number;
}

// used to store click info in IndexedDB
export interface NotificationClicked {
    notificationId: string;
    action: string;
    appId: string;
    url: string;
    timestamp: number;
}
