import { logMethodCall } from "../../shared/utils/utils";
import OneSignalError from "../../shared/errors/OneSignalError";
import ExecutorResult from "../executors/ExecutorResult";
import { UserPropertiesModel } from "../models/UserPropertiesModel";
import { Operation } from "../operationRepo/Operation";
import AliasPair from "./AliasPair";
import { RequestService } from "./RequestService";
import MainHelper from "../../shared/helpers/MainHelper";
import OneSignalApiBaseResponse from "../../shared/api/OneSignalApiBaseResponse";
import { getJWTHeader, jwtExpired } from "./helpers";
import { SupportedModel } from "../models/SupportedModels";
import { OSModel } from "../modelRepo/OSModel";

/**
 * This class contains logic for all the UserProperty model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class UserPropertyRequests {
  static async updateUserProperties(operation: Operation<SupportedModel>): Promise<ExecutorResult<UserPropertiesModel>> {
    logMethodCall("UserPropertyRequests.updateUserProperties", operation);

    const propertiesModel = operation.model as OSModel<UserPropertiesModel>;
    const properties = propertiesModel?.data;

    // fixes typescript errors
    if (!properties || !propertiesModel) {
      throw new OneSignalError(`updateUserProperty: bad identity model: ${propertiesModel}`);
    }

    // fixes typescript errors
    if (!propertiesModel.onesignalId) {
      throw new OneSignalError(`updateUserProperty: missing onesignalId: ${propertiesModel}`);
    }

    const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, propertiesModel.onesignalId);

    const appId = await MainHelper.getAppId();
    const jwtHeader = await getJWTHeader(operation.jwtToken);
    const response = await RequestService.updateUser({ appId, jwtHeader }, aliasPair, {
      properties,
    });
    return UserPropertyRequests._processUserPropertyResponse(operation, response);
  }

  private static _processUserPropertyResponse(operation: Operation<SupportedModel>, response?: OneSignalApiBaseResponse):
    ExecutorResult<UserPropertiesModel> {
      if (!response) {
        throw new Error("processUserPropertyResponse: response is not defined");
      }

      const { status, result } = response;

      if (status >= 200 && status < 300) {
        return new ExecutorResult(true, true, result?.properties);
      }

      if (status === 401 && result.code === 'auth-3') {
        return jwtExpired(operation.jwtToken);
      }

      if (status >= 400 && status < 500) {
        return new ExecutorResult(false, false);
      }

      return new ExecutorResult(false, true);
  }
}
