import type { Model, ModelChangedArgs } from '../models/Model';
import { type Operation } from '../operations/Operation';
import {
  type ISingletonModelStoreChangeHandler,
  ModelChangeTags,
} from '../types/models';
import type { IOperationRepo } from '../types/operation';
import type { ISingletonModelStore } from './types';

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
  protected _store: ISingletonModelStore<TModel>;
  protected _opRepo: IOperationRepo;

  constructor(store: ISingletonModelStore<TModel>, opRepo: IOperationRepo) {
    this._store = store;
    this._opRepo = opRepo;
    this._store._subscribe(this);
  }

  _onModelReplaced(model: TModel, tag: string): void {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = this._getReplaceOperation(model);
    if (operation != null) {
      this._opRepo._enqueue(operation);
    }
  }

  _onModelUpdated(args: ModelChangedArgs, tag: string): void {
    if (tag !== ModelChangeTags.NORMAL) {
      return;
    }

    const operation = this._getUpdateOperation(
      args.model as TModel,
      args.property,
      args.oldValue,
      args.newValue,
    );
    if (operation != null) {
      this._opRepo._enqueue(operation);
    }
  }

  /**
   * Called when the model has been replaced.
   * @return The operation to enqueue when the model has been replaced, or null if no operation should be enqueued.
   */
  abstract _getReplaceOperation(model: TModel): Operation | null;

  /**
   * Called when the model has been updated.
   * @return The operation to enqueue when the model has been updated, or null if no operation should be enqueued.
   */
  abstract _getUpdateOperation(
    model: TModel,
    property: string,
    oldValue: unknown,
    newValue: unknown,
  ): Operation | null;
}
