import { type Model, ModelChangedArgs } from '../models/Model';
import { type Operation } from '../operations/Operation';
import {
  ISingletonModelStoreChangeHandler,
  ModelChangeTags,
} from '../types/models';
import { IOperationRepo } from '../types/operation';
import { ISingletonModelStore } from './types';

// Implements logic similar to Android SDK's SingletonModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/listeners/SingletonModelStoreListener.kt
/**
 * A SingletonModelStore listener that translates a change in the
 * singleton store to an operation enqueued onto the IOperationRepo.
 * This is an abstract class; a concrete implementation must provide
 * the actual Operation to be enqueued.
 */
export abstract class SingletonModelStoreListener<TModel extends Model>
  implements ISingletonModelStoreChangeHandler<TModel>
{
  protected store: ISingletonModelStore<TModel>;
  protected opRepo: IOperationRepo;

  constructor(store: ISingletonModelStore<TModel>, opRepo: IOperationRepo) {
    this.store = store;
    this.opRepo = opRepo;
    this.store.subscribe(this);
  }

  onModelReplaced(model: TModel, tag: string): void {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = this.getReplaceOperation(model);
    if (operation != null) {
      this.opRepo.enqueue(operation);
    }
  }

  onModelUpdated(args: ModelChangedArgs, tag: string): void {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = this.getUpdateOperation(
      args.model as TModel,
      args.property,
      args.oldValue,
      args.newValue,
    );
    if (operation != null) {
      this.opRepo.enqueue(operation);
    }
  }

  /**
   * Called when the model has been replaced.
   * @return The operation to enqueue when the model has been replaced, or null if no operation should be enqueued.
   */
  abstract getReplaceOperation(model: TModel): Operation | null;

  /**
   * Called when the model has been updated.
   * @return The operation to enqueue when the model has been updated, or null if no operation should be enqueued.
   */
  abstract getUpdateOperation(
    model: TModel,
    property: string,
    oldValue: unknown,
    newValue: unknown,
  ): Operation | null;
}
