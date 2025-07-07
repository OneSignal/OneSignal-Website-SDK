import Environment from 'src/shared/helpers/Environment';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { ICustomEventController } from '../types/events';
import { CustomWebEvent } from './CustomWebEvent';

export class CustomEventController implements ICustomEventController {
  private readonly _identityModelStore: IdentityModelStore;
  private readonly _time: number;
  private readonly _subscriptionModelStore: SubscriptionModelStore;

  constructor({
    identityModelStore,
    subscriptionModelStore,
    time,
  }: {
    identityModelStore: IdentityModelStore;
    subscriptionModelStore: SubscriptionModelStore;
    time: number;
  }) {
    this._identityModelStore = identityModelStore;
    this._subscriptionModelStore = subscriptionModelStore;
    this._time = time;
  }

  async sendCustomEvent(
    name: string,
    properties?: Record<string, unknown>,
  ): Promise<void> {
    const identityModel = this._identityModelStore.model;

    const customEvent = new CustomWebEvent({
      externalId: identityModel.externalId,
      name,
      onesignalId: identityModel.onesignalId,
      properties,
      sdk: Environment.version(),
      timestamp: this._time,
    });

    // TODO: Send http request in next commit
  }

  saveCustomEvent(event: CustomEvent) {
    // TODO for the caching session
  }

  start() {
    // TODO send all cached events and clear the queue
  }
}
