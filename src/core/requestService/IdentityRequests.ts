import { logMethodCall } from "src/shared/utils/utils";
import OneSignalError from "../../shared/errors/OneSignalError";
import ExecutorResult from "../executors/ExecutorResult";
import { Operation } from "../operationRepo/Operation";
import { processIdentityOperation } from "./helpers";
import { RequestService } from "./RequestService";

/**
 * This class contains logic for all the Identity model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class IdentityRequests {
  static async addIdentity<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    logMethodCall("addIdentity", operation);

    const { identity, aliasPair } = processIdentityOperation(operation);

    try {
      const result = await RequestService.identifyUser(aliasPair, identity);

      return new ExecutorResult(true, true, result);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }


  static async removeIdentity<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    logMethodCall("removeIdentity", operation);

    if (!operation.payload) {
      throw new OneSignalError("removeIdentity: operation.payload is not defined");
    }

    if (Object.keys(operation.payload).length !== 1) {
      throw new OneSignalError("removeIdentity: operation.payload must have exactly one key");
    }

    const labelToRemove = Object.keys(operation.payload)[0];

    const { aliasPair } = processIdentityOperation(operation);

    try {
      const result = await RequestService.deleteAlias(aliasPair, labelToRemove);

      return new ExecutorResult(true, true, result);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }
}
