import OneSignalError from "../../shared/errors/OneSignalError";
import ExecutorResult from "../executors/ExecutorResult";
import { Operation } from "../operationRepo/Operation";
import AliasPair from "./AliasPair";
import { RequestService } from "./RequestService";

/**
 * This class contains logic for all the UserProperty model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class UserPropertyRequests {
  static async updateUserProperties<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    console.log("updateUserProperty");

    const properties = operation.model?.data;
    const propertiesModel = operation.model;

    if (!properties || !propertiesModel) {
      throw new OneSignalError(`updateUserProperty: bad identity model: ${propertiesModel}`);
    }

    if (!propertiesModel.onesignalId) {
      throw new OneSignalError(`updateUserProperty: missing onesignalId: ${propertiesModel}`);
    }

    const aliasPair = new AliasPair("onesignalId", propertiesModel.onesignalId);

    // TO DO: get refreshDeviceMetaData
    const refreshDeviceMetaData = true;

    try {
      const result = await RequestService.updateUser(aliasPair, {
        properties: properties,
        refresh_device_metadata: refreshDeviceMetaData,
        deltas: operation.payload
      });

      return new ExecutorResult(true, true, result);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }
}
