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
}

export interface NotificationReceived {
    notificationId: string;
    appId: string;
    url?: string;
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
