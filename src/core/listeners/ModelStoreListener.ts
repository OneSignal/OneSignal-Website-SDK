import type { Model, ModelChangedArgs } from '../models/Model';
import { Operation } from '../operations/Operation';
import { ModelChangeTags, type IModelStore } from '../types/models';
import type { IOperationRepo } from '../types/operation';

// Implements logic similar to Android SDK's ModelStoreListener
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/listeners/ModelStoreListener.kt
/**
 * A model store listener that translates changes in a model or model store
 * into operations that are enqueued onto the operation repository.
 * This is an abstract class; a concrete implementation must provide
 * the specific Operation that should be enqueued.
 */
export abstract class ModelStoreListener<TModel extends Model> {
  protected store: IModelStore<TModel>;
  protected opRepo: IOperationRepo;

  constructor(store: IModelStore<TModel>, opRepo: IOperationRepo) {
    this.store = store;
    this.opRepo = opRepo;
    this.store.subscribe(this);
  }

  close(): void {
    this.store.unsubscribe(this);
  }

  onModelAdded(model: TModel, tag: string): void {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = this.getAddOperation(model);
    if (operation != null) {
      this.opRepo.enqueue(operation);
    }
  }

  async onModelUpdated(args: ModelChangedArgs, tag: string): Promise<void> {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = await this.getUpdateOperation(
      args.model as TModel,
      args.property,
      args.oldValue,
      args.newValue,
    );
    if (operation != null) {
      this.opRepo.enqueue(operation);
    }
  }

  async onModelRemoved(model: TModel, tag: string): Promise<void> {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = await this.getRemoveOperation(model);
    if (operation != null) {
      this.opRepo.enqueue(operation);
    }
  }

  /**
   * Called when a model has been added to the model store.
   * @return The operation to enqueue when a model has been added, or null if no operation should be enqueued.
   */
  abstract getAddOperation(model: TModel): Operation | null;

  /**
   * Called when a model has been removed from the model store.
   * @return The operation to enqueue when a model has been removed, or null if no operation should be enqueued.
   */
  abstract getRemoveOperation(model: TModel): Operation | null;

  /**
   * Called when a model has been updated.
   * @return The operation to enqueue when the model has been updated, or null if no operation should be enqueued.
   */
  abstract getUpdateOperation(
    model: TModel,
    property: string,
    oldValue: unknown,
    newValue: unknown,
  ): Operation | null;
}
