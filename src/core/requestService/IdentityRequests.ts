import OneSignalApiBaseResponse from "../../shared/api/OneSignalApiBaseResponse";
import { logMethodCall } from "../../shared/utils/utils";
import OneSignalError from "../../shared/errors/OneSignalError";
import ExecutorResult from "../executors/ExecutorResult";
import { IdentityModel } from "../models/IdentityModel";
import { Operation } from "../operationRepo/Operation";
import { isIdentityObject } from "../utils/typePredicates";
import { getJWTHeader, jwtExpired, processIdentityOperation } from "./helpers";
import { RequestService } from "./RequestService";
import MainHelper from "../../shared/helpers/MainHelper";
import { SupportedModel } from "../models/SupportedModels";

/**
 * This class contains logic for all the Identity model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class IdentityRequests {
  static async addIdentity(operation: Operation<SupportedModel>): Promise<ExecutorResult<IdentityModel>> {
    logMethodCall("addIdentity", operation);
    const appId = await MainHelper.getAppId();
    const jwtHeader = await getJWTHeader(operation.jwtToken);

    const { identity, aliasPair } = processIdentityOperation(operation);

    const response = await RequestService.addAlias({ appId, jwtHeader }, aliasPair, identity);
    return IdentityRequests._processIdentityResponse(operation, response);
  }

  static async removeIdentity(operation: Operation<SupportedModel>): Promise<ExecutorResult<IdentityModel>> {
    logMethodCall("removeIdentity", operation);

    if (!operation.payload) {
      throw new OneSignalError("removeIdentity: operation.payload is not defined");
    }

    if (Object.keys(operation.payload).length !== 1) {
      throw new OneSignalError("removeIdentity: operation.payload must have exactly one key");
    }

    const appId = await MainHelper.getAppId();
    const jwtHeader = await getJWTHeader();
    const labelToRemove = Object.keys(operation.payload)[0];
    const { aliasPair } = processIdentityOperation(operation);

    const response = await RequestService.deleteAlias({ appId, jwtHeader }, aliasPair, labelToRemove);
    return IdentityRequests._processIdentityResponse(operation, response);
  }

  private static _processIdentityResponse(operation: Operation<SupportedModel>, response?: OneSignalApiBaseResponse): ExecutorResult<IdentityModel> {
    if (!response) {
      throw new OneSignalError("processIdentityResponse: response is not defined");
    }

    const { status, result } = response;
    const { identity } = result;

    if (status >= 200 && status < 300) {
      if (!isIdentityObject(identity)) {
        throw new OneSignalError(`processIdentityResponse: result ${identity} is not an identity object`);
      }

      return new ExecutorResult(true, true, identity);
    }

    if (status === 401 && result.code === 'auth-3') {
      return jwtExpired(operation.jwtToken);
    }

    // shouldn't impact login since doesn't go through core module (special 409 case)
    if (status >= 400 && status < 500) {
      return new ExecutorResult(false, false);
    }

    return new ExecutorResult(false, true);
  }
}
