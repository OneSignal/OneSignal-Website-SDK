import type { AppConfig } from '../shared/config/types';
import type { ContextSWInterface } from '../shared/context/types';
import { getSubscriptionManagerSW } from '../shared/helpers/context';
import { WorkerMessengerSW } from '../shared/libraries/workerMessenger/sw';
import { SubscriptionManagerSW } from '../shared/managers/subscription/sw';

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
