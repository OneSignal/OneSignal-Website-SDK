import MainHelper from '../../shared/helpers/MainHelper';
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

  sendCustomEvent(event: ICustomEvent): void {
    const appId = MainHelper.getAppId();
    const identityModel = this._identityModelStore.model;

    const op = new TrackCustomEventOperation({
      appId,
      onesignalId: identityModel.onesignalId,
      externalId: identityModel.externalId,
      timestamp: new Date().toISOString(),
      event,
    });

    this._opRepo.enqueue(op);
  }
}
