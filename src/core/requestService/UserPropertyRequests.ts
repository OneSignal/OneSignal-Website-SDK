import { logMethodCall } from "../../shared/utils/utils";
import OneSignalError from "../../shared/errors/OneSignalError";
import ExecutorResult from "../executors/ExecutorResult";
import { UserPropertiesModel } from "../models/UserPropertiesModel";
import { Operation } from "../operationRepo/Operation";
import AliasPair from "./AliasPair";
import { RequestService } from "./RequestService";

/**
 * This class contains logic for all the UserProperty model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class UserPropertyRequests {
  static async updateUserProperties<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    logMethodCall("UserPropertyRequests.updateUserProperties", operation);

    const propertiesModel = operation.model;
    const properties = propertiesModel?.data;

    // fixes typescript errors
    if (!properties || !propertiesModel) {
      throw new OneSignalError(`updateUserProperty: bad identity model: ${propertiesModel}`);
    }

    // fixes typescript errors
    if (!propertiesModel.onesignalId) {
      throw new OneSignalError(`updateUserProperty: missing onesignalId: ${propertiesModel}`);
    }

    const aliasPair = new AliasPair("onesignalId", propertiesModel.onesignalId);

    // TO DO: get refreshDeviceMetaData from session service
    const refreshDeviceMetaData = true;

    try {
      const result = await RequestService.updateUser(aliasPair, {
        properties,
        refresh_device_metadata: refreshDeviceMetaData,
        // TO DO: this would just be the session data, link into session service
        deltas: operation.payload as Partial<UserPropertiesModel>
      });

      return new ExecutorResult(true, true, result);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }
}