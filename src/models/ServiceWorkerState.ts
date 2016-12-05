import { Notification } from "./Notification";


class ServiceWorkerState {
  workerVersion: number;
  updaterWorkerVersion: number;
  backupNotification: Notification;
}

export { ServiceWorkerState };