import { logMethodCall } from '../../shared/utils/utils';
import Subscribable from '../Subscribable';
import EncodedModel from '../caching/EncodedModel';
import {
  ModelStoreChange,
  ModelStoreHydrated,
  ModelStoreUpdated,
} from '../models/ModelStoreChange';
import { StringKeys } from '../models/StringKeys';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { OSModelUpdatedArgs } from './OSModelUpdatedArgs';

export class OSModel<Model> extends Subscribable<ModelStoreChange<Model>> {
  data: Model;
  modelId: string;
  onesignalId?: string;
  awaitOneSignalIdAvailable: Promise<string>;
  onesignalIdAvailableCallback?: (onesignalId: string) => void;
  externalId?: string;
  applyToRecordId?: string;

  constructor(
    readonly modelName: ModelName,
    data: Model,
    modelId?: string,
  ) {
    super();
    this.modelId = modelId ?? Math.random().toString(36).substring(2);
    this.modelName = modelName;
    this.data = data;
    this.onesignalId = undefined;
    this.externalId = undefined;

    this.awaitOneSignalIdAvailable = new Promise<string>((resolve) => {
      this.onesignalIdAvailableCallback = resolve;
    });
  }

  /**
   * Sets the class-level onesignalId property.
   * IMPORTANT: this function does not update the model's `data` property.
   * @param onesignalId - The OneSignal ID to set.
   */
  public setOneSignalId(onesignalId?: string): void {
    logMethodCall('setOneSignalId', { onesignalId });
    this.onesignalId = onesignalId;

    if (onesignalId) {
      this.onesignalIdAvailableCallback?.(onesignalId);
    }
  }

  public setExternalId(externalId?: string): void {
    logMethodCall('setExternalId', { externalId });
    this.externalId = externalId;
  }

  public setApplyToRecordId(applyToRecordId: string): void {
    logMethodCall('setapplyToRecordId', { applyToRecordId });
    this.applyToRecordId = applyToRecordId;
  }

  /**
   * We use this method to update the model data.
   * Results in a broadcasted update event.
   */
  public set(
    property: StringKeys<Model>,
    newValue: NonNullable<Model>[StringKeys<Model>],
    propagate = true,
  ): void {
    logMethodCall('set', { property, newValue });
    let oldValue;

    if (this.data) {
      oldValue = this.data[property];
      this.data[property] = newValue;
    }

    if (propagate) {
      const change = new ModelStoreUpdated(
        this.modelId,
        new OSModelUpdatedArgs(this, property, oldValue, newValue),
      );
      this.broadcast(change);
    }
  }

  /**
   * Updates the entire model data.
   * To be called when updating the data with a remote sync.
   */
  public hydrate(data: Model): void {
    logMethodCall('hydrate', { data });
    this.data = data;
    this.broadcast(new ModelStoreHydrated(this.modelId, this));
  }

  /**
   * Prepares model for storage in IndexedDB via ModelCache.
   * @returns An encoded version of the model.
   */
  public encode(): EncodedModel {
    const modelId = this.modelId as string;
    const modelName = this.modelName;
    const onesignalId = this.onesignalId;
    const externalId = this.externalId;
    return { modelId, modelName, onesignalId, externalId, ...this.data };
  }

  /**
   * Creates a new OSModel of type `modelName` from an encoded model with same `data` and `modelId`.
   * @param encodedModel - An encoded model from IndexedDB.
   * @returns OSModel object
   */
  static decode(encodedModel: EncodedModel): OSModel<SupportedModel> {
    logMethodCall('decode', { encodedModel });
    const { modelId, modelName, onesignalId, externalId, ...data } =
      encodedModel;

    const decodedModel = new OSModel<SupportedModel>(
      modelName as ModelName,
      data,
      modelId,
    );

    decodedModel.setOneSignalId(onesignalId);
    decodedModel.setExternalId(externalId);
    return decodedModel;
  }
}
