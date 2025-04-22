import { IPreferencesService } from 'src/core/types/preferences';
import Log from 'src/shared/libraries/Log';
import { OPERATION_NAME } from '../constants';
import { CreateSubscriptionOperation } from '../operations/CreateSubscriptionOperation';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { DeleteSubscriptionOperation } from '../operations/DeleteSubscriptionOperation';
import { DeleteTagOperation } from '../operations/DeleteTagOperation';
import { LoginUserFromSubscriptionOperation } from '../operations/LoginUserFromSubscriptionOperation';
import { LoginUserOperation } from '../operations/LoginUserOperation';
import { Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { SetTagOperation } from '../operations/SetTagOperation';
import { TrackSessionEndOperation } from '../operations/TrackSessionEndOperation';
import { TrackSessionStartOperation } from '../operations/TrackSessionStartOperation';
import { TransferSubscriptionOperation } from '../operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from '../operations/UpdateSubscriptionOperation';
import { ModelStore } from './ModelStore';

// Implements logic similar to Android SDK's OperationModelStore
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/core/internal/operations/impl/OperationModelStore.kt
export class OperationModelStore extends ModelStore<Operation> {
  constructor(prefs: IPreferencesService) {
    super('operations', prefs);
  }

  loadOperations(): void {
    this.load();
  }

  create(jsonObject: { name?: string } | null): Operation | null {
    if (jsonObject === null) {
      Log.error('null jsonObject sent to OperationModelStore.create');
      return null;
    }

    if (!this.isValidOperation(jsonObject)) {
      return null;
    }

    // Determine the type of operation based on the name property in the json
    const operationName = jsonObject.name;
    let operation: Operation;

    switch (operationName) {
      case OPERATION_NAME.SET_ALIAS:
        operation = new SetAliasOperation();
        break;
      case OPERATION_NAME.DELETE_ALIAS:
        operation = new DeleteAliasOperation();
        break;
      case OPERATION_NAME.CREATE_SUBSCRIPTION:
        operation = new CreateSubscriptionOperation();
        break;
      case OPERATION_NAME.UPDATE_SUBSCRIPTION:
        operation = new UpdateSubscriptionOperation();
        break;
      case OPERATION_NAME.DELETE_SUBSCRIPTION:
        operation = new DeleteSubscriptionOperation();
        break;
      case OPERATION_NAME.TRANSFER_SUBSCRIPTION:
        operation = new TransferSubscriptionOperation();
        break;
      case OPERATION_NAME.LOGIN_USER:
        operation = new LoginUserOperation();
        break;
      case OPERATION_NAME.LOGIN_USER_FROM_SUBSCRIPTION_USER:
        operation = new LoginUserFromSubscriptionOperation();
        break;
      case OPERATION_NAME.REFRESH_USER:
        operation = new RefreshUserOperation();
        break;
      case OPERATION_NAME.SET_TAG:
        operation = new SetTagOperation();
        break;
      case OPERATION_NAME.DELETE_TAG:
        operation = new DeleteTagOperation();
        break;
      case OPERATION_NAME.SET_PROPERTY:
        operation = new SetPropertyOperation();
        break;
      case OPERATION_NAME.TRACK_SESSION_START:
        operation = new TrackSessionStartOperation();
        break;
      case OPERATION_NAME.TRACK_SESSION_END:
        operation = new TrackSessionEndOperation();
        break;
      default:
        throw new Error(`Unrecognized operation: ${operationName}`);
    }

    // populate the operation with the data
    operation.initializeFromJson(jsonObject);

    return operation;
  }

  /**
   * Checks if a JSON object is a valid Operation. Contains a check for onesignalId.
   * This is a rare case that a cached Operation is missing the onesignalId,
   * which would continuously cause crashes when the Operation is processed.
   *
   * @param object The JSON object that represents an Operation
   */
  private isValidOperation(object: {
    name?: string;
    onesignalId?: string;
  }): boolean {
    const operationName = object.name;
    if (!operationName) {
      Log.error("jsonObject must have 'name' attribute");
      return false;
    }

    const excluded = new Set<string>([
      OPERATION_NAME.LOGIN_USER,
      OPERATION_NAME.LOGIN_USER_FROM_SUBSCRIPTION_USER,
    ]);

    // Must have onesignalId if it is not one of the excluded operations above
    if (!object.onesignalId && !excluded.has(operationName)) {
      Log.error(
        `${operationName} jsonObject must have 'onesignalId' attribute`,
      );
      return false;
    }

    return true;
  }
}
