import { getAppId } from '../../shared/helpers/main';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { TrackCustomEventOperation } from '../operations/TrackCustomEventOperation';
import type {
  ICustomEvent,
  ICustomEventController,
} from '../types/customEvents';
import type { IOperationRepo } from '../types/operation';

/**
 * Implements custom event tracking functionality.
 * This class handles sending custom events by creating TrackEventOperation instances
 * and enqueueing them for execution via the operation repository.
 */
export class CustomEventController implements ICustomEventController {
  private readonly _identityModelStore: IdentityModelStore;
  private readonly _opRepo: IOperationRepo;

  constructor(identityModelStore: IdentityModelStore, opRepo: IOperationRepo) {
    this._identityModelStore = identityModelStore;
    this._opRepo = opRepo;
  }

  _sendCustomEvent(event: ICustomEvent): void {
    const appId = getAppId();
    const identityModel = this._identityModelStore._model;

    const op = new TrackCustomEventOperation({
      appId,
      onesignalId: identityModel._onesignalId,
      externalId: identityModel._externalId,
      timestamp: new Date().toISOString(),
      event,
    });

    this._opRepo._enqueue(op);
  }
}
