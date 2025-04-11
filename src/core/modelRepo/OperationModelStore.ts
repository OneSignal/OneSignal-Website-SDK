import Log from 'src/shared/libraries/Log';
import { IPreferencesService } from 'src/types/preferences';
import { Operation } from '../operationRepo/Operation';
// import { ModelStore } from '../../common/modeling/ModelStore';
// import { CreateSubscriptionOperation } from '../../user/operations/CreateSubscriptionOperation';
// import { DeleteAliasOperation } from '../../user/operations/DeleteAliasOperation';
// import { DeleteSubscriptionOperation } from '../../user/operations/DeleteSubscriptionOperation';
// import { DeleteTagOperation } from '../../user/operations/DeleteTagOperation';
// import { IdentityOperationExecutor } from '../../user/operations/executors/IdentityOperationExecutor';
// import { LoginUserFromSubscriptionOperationExecutor } from '../../user/operations/executors/LoginUserFromSubscriptionOperationExecutor';
// import { LoginUserOperationExecutor } from '../../user/operations/executors/LoginUserOperationExecutor';
// import { RefreshUserOperationExecutor } from '../../user/operations/executors/RefreshUserOperationExecutor';
// import { SubscriptionOperationExecutor } from '../../user/operations/executors/SubscriptionOperationExecutor';
// import { UpdateUserOperationExecutor } from '../../user/operations/executors/UpdateUserOperationExecutor';
// import { LoginUserFromSubscriptionOperation } from '../../user/operations/LoginUserFromSubscriptionOperation';
// import { LoginUserOperation } from '../../user/operations/LoginUserOperation';
// import { RefreshUserOperation } from '../../user/operations/RefreshUserOperation';
// import { SetAliasOperation } from '../../user/operations/SetAliasOperation';
// import { SetPropertyOperation } from '../../user/operations/SetPropertyOperation';
// import { SetTagOperation } from '../../user/operations/SetTagOperation';
// import { TrackPurchaseOperation } from '../../user/operations/TrackPurchaseOperation';
// import { TrackSessionEndOperation } from '../../user/operations/TrackSessionEndOperation';
// import { TrackSessionStartOperation } from '../../user/operations/TrackSessionStartOperation';
// import { TransferSubscriptionOperation } from '../../user/operations/TransferSubscriptionOperation';
// import { UpdateSubscriptionOperation } from '../../user/operations/UpdateSubscriptionOperation';
// import { Operation } from '../operations/Operation';
// import { IPreferencesService } from '../preferences/IPreferencesService';

export class OperationModelStore extends ModelStore<Operation> {
  constructor(prefs: IPreferencesService) {
    super('operations', prefs);
  }

  loadOperations(): void {
    this.load();
  }

  protected create(jsonObject: Record<string, any> | null): Operation | null {
    if (jsonObject === null) {
      Logging.error('null jsonObject sent to OperationModelStore.create');
      return null;
    }

    if (!this.isValidOperation(jsonObject)) {
      return null;
    }

    // Determine the type of operation based on the name property in the json
    let operation: Operation;
    const operationName = jsonObject['name'];

    switch (operationName) {
      case IdentityOperationExecutor.SET_ALIAS:
        operation = new SetAliasOperation();
        break;
      case IdentityOperationExecutor.DELETE_ALIAS:
        operation = new DeleteAliasOperation();
        break;
      case SubscriptionOperationExecutor.CREATE_SUBSCRIPTION:
        operation = new CreateSubscriptionOperation();
        break;
      case SubscriptionOperationExecutor.UPDATE_SUBSCRIPTION:
        operation = new UpdateSubscriptionOperation();
        break;
      case SubscriptionOperationExecutor.DELETE_SUBSCRIPTION:
        operation = new DeleteSubscriptionOperation();
        break;
      case SubscriptionOperationExecutor.TRANSFER_SUBSCRIPTION:
        operation = new TransferSubscriptionOperation();
        break;
      case LoginUserOperationExecutor.LOGIN_USER:
        operation = new LoginUserOperation();
        break;
      case LoginUserFromSubscriptionOperationExecutor.LOGIN_USER_FROM_SUBSCRIPTION_USER:
        operation = new LoginUserFromSubscriptionOperation();
        break;
      case RefreshUserOperationExecutor.REFRESH_USER:
        operation = new RefreshUserOperation();
        break;
      case UpdateUserOperationExecutor.SET_TAG:
        operation = new SetTagOperation();
        break;
      case UpdateUserOperationExecutor.DELETE_TAG:
        operation = new DeleteTagOperation();
        break;
      case UpdateUserOperationExecutor.SET_PROPERTY:
        operation = new SetPropertyOperation();
        break;
      case UpdateUserOperationExecutor.TRACK_SESSION_START:
        operation = new TrackSessionStartOperation();
        break;
      case UpdateUserOperationExecutor.TRACK_SESSION_END:
        operation = new TrackSessionEndOperation();
        break;
      case UpdateUserOperationExecutor.TRACK_PURCHASE:
        operation = new TrackPurchaseOperation();
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
  private isValidOperation(object: Record<string, unknown>): boolean {
    const operationName = object.name;
    if (!operationName) {
      Log.error("jsonObject must have 'name' attribute");
      return false;
    }

    const excluded = new Set([
      LoginUserOperationExecutor.LOGIN_USER,
      LoginUserFromSubscriptionOperationExecutor.LOGIN_USER_FROM_SUBSCRIPTION_USER,
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
