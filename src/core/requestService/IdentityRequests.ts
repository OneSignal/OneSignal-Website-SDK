import OneSignalApiBaseResponse from "../../shared/api/OneSignalApiBaseResponse";
import { logMethodCall } from "../../shared/utils/utils";
import OneSignalError from "../../shared/errors/OneSignalError";
import ExecutorResult from "../executors/ExecutorResult";
import { IdentityModel } from "../models/IdentityModel";
import { Operation } from "../operationRepo/Operation";
import { isIdentityObject } from "../utils/typePredicates";
import { processIdentityOperation } from "./helpers";
import { RequestService } from "./RequestService";

/**
 * This class contains logic for all the Identity model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class IdentityRequests {
  static async addIdentity<Model>(operation: Operation<Model>): Promise<ExecutorResult<IdentityModel>> {
    logMethodCall("addIdentity", operation);

    const { identity, aliasPair } = processIdentityOperation(operation);

    const response = await RequestService.identifyUser(aliasPair, identity);
    return this._processIdentityResponse(response);
  }

  static async removeIdentity<Model>(operation: Operation<Model>): Promise<ExecutorResult<IdentityModel>> {
    logMethodCall("removeIdentity", operation);

    if (!operation.payload) {
      throw new OneSignalError("removeIdentity: operation.payload is not defined");
    }

    if (Object.keys(operation.payload).length !== 1) {
      throw new OneSignalError("removeIdentity: operation.payload must have exactly one key");
    }

    const labelToRemove = Object.keys(operation.payload)[0];

    const { aliasPair } = processIdentityOperation(operation);

    const response = await RequestService.deleteAlias(aliasPair, labelToRemove);
    return this._processIdentityResponse(response);
  }

  private static _processIdentityResponse(response?: OneSignalApiBaseResponse): ExecutorResult<IdentityModel> {
    if (!response) {
      throw new OneSignalError("processIdentityResponse: response is not defined");
    }

    const { status, result } = response;

    if (!isIdentityObject(result)) {
      throw new OneSignalError(`processIdentityResponse: result ${result} is not an identity object`);
    }

    if (status >= 200 && status < 300) {
      return new ExecutorResult(true, true, result);
    }
    return new ExecutorResult(false, true);
  }
}
