import PushManager from './PushManager';
import Notification from './Notification';
import NotificationEvent from './NotificationEvent';
import ServiceWorker from '../ServiceWorker';
import { ServiceWorkerContainer } from '../ServiceWorkerContainer';


// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
export default class ServiceWorkerRegistration {
  active: ServiceWorker;
  installing: ServiceWorker;
  waiting: ServiceWorker;
  onupdatefound: (e: Event) => void;
  pushManager: PushManager;
  private notifications: Array<Notification>;

  constructor() {
    this.active = null;
    this.installing = null;
    this.onupdatefound = null;
    this.pushManager = new PushManager();
    this.waiting = null;

    this.notifications = [];
  }

  get scope() {
    if (this.active) {
      return new URL(this.active.scriptURL).origin;
    }
    return null;
  }

  async getNotifications() {
    return this.notifications;
  }

  showNotification(title, options) {
    const notification = new Notification(title, options);
    this.notifications.push(notification);
    notification.close = () => {
      const index = this.notifications.indexOf(notification);
      this.notifications.splice(index, 1);
    };
    return Promise.resolve(new NotificationEvent(notification));
  }

  async update() {
  }

  async unregister() {
    const container: ServiceWorkerContainer = navigator.serviceWorker as any;
    container.serviceWorkerRegistration = null;
    this.active = null;
  }

  snapshot() {
    return this.notifications.map(n => n.snapshot());
  }
}
