import Log from 'src/shared/libraries/Log';
import { IPreferencesService } from 'src/types/preferences';
import { OPERATION_NAME } from '../executors/constants';
import { DeleteAliasOperation } from '../operations/DeleteAliasOperation';
import { DeleteTagOperation } from '../operations/DeleteTagOperation';
import { Operation } from '../operations/Operation';
import { SetAliasOperation } from '../operations/SetAliasOperation';
import { SetTagOperation } from '../operations/SetTagOperation';
import { ModelStore } from './ModelStore';

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
      case OPERATION_NAME.SET_TAG:
        operation = new SetTagOperation();
        break;
      case OPERATION_NAME.DELETE_TAG:
        operation = new DeleteTagOperation();
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
      // TODO: Add these back in once the executors are implemented
      // LoginUserOperationExecutor.LOGIN_USER,
      // LoginUserFromSubscriptionOperationExecutor.LOGIN_USER_FROM_SUBSCRIPTION_USER,
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
