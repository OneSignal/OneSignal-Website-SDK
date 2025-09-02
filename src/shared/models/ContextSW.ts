import type { AppConfig } from '../config/types';
import type { ContextSWInterface } from '../context/types';
import { getSubscriptionManagerSW } from '../helpers/context';
import { WorkerMessengerSW } from '../libraries/workerMessenger/sw';
import { SubscriptionManagerSW } from '../managers/subscription/sw';

export default class ContextSW implements ContextSWInterface {
  public _appConfig: AppConfig;
  public _subscriptionManager: SubscriptionManagerSW;
  public _workerMessenger: WorkerMessengerSW;

  constructor(appConfig: AppConfig) {
    this._appConfig = appConfig;
    this._subscriptionManager = getSubscriptionManagerSW(this);
    this._workerMessenger = new WorkerMessengerSW(this);
  }
}
