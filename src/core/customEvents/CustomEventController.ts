import Environment from 'src/shared/helpers/Environment';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import { IdentityConstants } from '../constants';
import { IdentityModel } from '../models/IdentityModel';
import { ModelChangedArgs } from '../models/Model';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { RequestService } from '../requestService/RequestService';
import { ICustomEventController } from '../types/events';
import { CustomWebEvent } from './CustomWebEvent';

export class CustomEventController implements ICustomEventController {
  private readonly _identityModelStore: IdentityModelStore;
  private readonly queue: CustomWebEvent[] = [];

  constructor(identityModelStore: IdentityModelStore) {
    this._identityModelStore = identityModelStore;
    this._identityModelStore.subscribe(this);
  }

  enqueueCustomEvent(name: string, properties?: Record<string, unknown>) {
    const identityModel = this._identityModelStore.model;

    const customEvent = new CustomWebEvent({
      externalId: identityModel.externalId,
      name,
      onesignalId: identityModel.onesignalId,
      properties,
      sdk: Environment.version(),
      timestamp: this._time,
    });

    // immediately send the event if onesignalId is already retrieved
    this.saveCustomEvent(customEvent);
    if (!IDManager.isLocalId(identityModel.onesignalId)) {
      this.sendCustomEvent(customEvent);
    }
  }

  private async sendCustomEvent(event: CustomWebEvent) {
    // send the custom event in the background
    try {
      const request = await RequestService.sendCustomEvent(
        { appId: event.appId },
        event.toJSON(),
      );
      if (request.ok) throw new Error('Failed to send custom event');
    } catch (err) {
      // TODO: handling 400 response due to payload being too large
      Log.warn(`ERROR: ${err} for sending ${event.name}, `);
    }

    this.queue.splice(this.queue.indexOf(event), 1);
  }

  saveCustomEvent(event: CustomWebEvent) {
    this.queue.push(event);
  }

  private updateAllEventsWithOnesignalId(onesignalId: string) {
    this.queue.forEach((event) => {
      if (event.onesignalId && IDManager.isLocalId(event.onesignalId)) {
        event.updateOnesignalId(onesignalId);
      }
    });
  }

  private sendAllSavedEvents() {
    this.queue.forEach((event) => {
      if (event.onesignalId && !IDManager.isLocalId(event.onesignalId)) {
        this.sendCustomEvent(event);
      }
    });
  }

  start() {
    this.sendAllSavedEvents();
  }

  onModelReplaced(model: IdentityModel, tag: string) {}

  onModelUpdated(args: ModelChangedArgs, tag: string) {
    if (args.property == IdentityConstants.ONESIGNAL_ID) {
      const onesignalId = args.newValue as string;
      if (!IDManager.isLocalId(onesignalId)) {
        // the onesignal ID is updated, send all queued events with the updated onesignal ID
        this.updateAllEventsWithOnesignalId(onesignalId);
        this.sendAllSavedEvents();
      }
    }
  }
}
