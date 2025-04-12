import Log from 'src/shared/libraries/Log';
import { IPreferencesService } from 'src/types/preferences';
import { Operation } from '../operations/Operation';
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
    let operation: Operation;
    // const operationName = jsonObject.name;

    // TODO: add in executors in later prs
    // switch (operationName) {
    //   default:
    //     throw new Error(`Unrecognized operation: ${operationName}`);
    // }

    // populate the operation with the data
    // @ts-expect-error - TODO: add in executors in later prs
    operation.initializeFromJson(jsonObject);

    // @ts-expect-error - TODO: add in executors in later prs
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
