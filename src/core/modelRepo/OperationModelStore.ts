import type { IDBStoreName } from 'src/shared/database/types';
import { UnknownOpError } from 'src/shared/errors/common';
import { error } from 'src/shared/libraries/log';
import { OPERATION_NAME } from '../constants';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { TrackCustomEventOperation } from '../operations/TrackCustomEventOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { ModelStore } from './ModelStore';

// Implements logic similar to Android SDK's OperationModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/impl/OperationModelStore.kt
export class OperationModelStore extends ModelStore<Operation> {
  constructor() {
    super('operations' satisfies IDBStoreName);
  }

  async _loadOperations(): Promise<void> {
    return this._load();
  }

  _create(jsonObject?: { name?: string } | null): Operation | null {
    if (jsonObject === null) {
      error('null jsonObject sent to OperationModelStore.create');
      return null;
    }

    if (!this._isValidOperation(jsonObject)) {
      return null;
    }

    // Determine the type of operation based on the name property in the json
    const operationName = jsonObject.name;
    let operation: Operation;

    switch (operationName) {
      case OPERATION_NAME._SetAlias:
        operation = new SetAliasOperation();
        break;
      case OPERATION_NAME._DeleteAlias:
        operation = new DeleteAliasOperation();
        break;
      case OPERATION_NAME._CreateSubscription:
        operation = new CreateSubscriptionOperation();
        break;
      case OPERATION_NAME._UpdateSubscription:
        operation = new UpdateSubscriptionOperation();
        break;
      case OPERATION_NAME._DeleteSubscription:
        operation = new DeleteSubscriptionOperation();
        break;
      case OPERATION_NAME._TransferSubscription:
        operation = new TransferSubscriptionOperation();
        break;
      case OPERATION_NAME._LoginUser:
        operation = new LoginUserOperation();
        break;
      case OPERATION_NAME._RefreshUser:
        operation = new RefreshUserOperation();
        break;
      case OPERATION_NAME._SetProperty:
        operation = new SetPropertyOperation();
        break;
      case OPERATION_NAME._CustomEvent:
        operation = new TrackCustomEventOperation();
        break;
      default:
        throw UnknownOpError({ _name: operationName });
    }

    // populate the operation with the data
    operation._initializeFromJson(jsonObject);

    return operation;
  }

  /**
   * Checks if a JSON object is a valid Operation. Contains a check for onesignalId.
   * This is a rare case that a cached Operation is missing the onesignalId,
   * which would continuously cause crashes when the Operation is processed.
   *
   * @param object The JSON object that represents an Operation
   */
  private _isValidOperation(object?: {
    name?: string;
    onesignalId?: string;
  }): object is {
    name: string;
    onesignalId?: string;
  } {
    const operationName = object?.name;
    if (!operationName) {
      error("jsonObject must have 'name' attribute");
      return false;
    }

    const excluded = new Set<string>([OPERATION_NAME._LoginUser]);

    // Must have onesignalId if it is not one of the excluded operations above
    if (!object.onesignalId && !excluded.has(operationName)) {
      error(`${operationName} jsonObject must have 'onesignalId' attribute`);
      return false;
    }

    return true;
  }
}
