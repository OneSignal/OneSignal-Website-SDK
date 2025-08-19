import type { AppConfig } from '../config/types';
import type { ContextSWInterface } from '../context/types';
import { getSubscriptionManagerSW } from '../helpers/context';
import { WorkerMessengerSW } from '../libraries/workerMessenger/sw';
import { SubscriptionManagerSW } from '../managers/subscription/sw';

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: SubscriptionManagerSW;
  public workerMessenger: WorkerMessengerSW;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = getSubscriptionManagerSW(this);
    this.workerMessenger = new WorkerMessengerSW(this);
  }
}
