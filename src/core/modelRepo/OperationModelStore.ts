import Log from 'src/shared/libraries/Log';
import { IPreferencesService } from 'src/types/preferences';
import { Operation } from '../operationRepo/Operation';
import { ModelStore } from './ModelStore';

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
