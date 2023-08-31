import { logMethodCall } from '../../shared/utils/utils';
import OneSignalError from '../../shared/errors/OneSignalError';
import {
  ExecutorResult,
  ExecutorResultFailNotRetriable,
  ExecutorResultFailRetriable,
  ExecutorResultSuccess,
} from '../executors/ExecutorResult';
import { UserPropertiesModel } from '../models/UserPropertiesModel';
import { Operation } from '../operationRepo/Operation';
import AliasPair from './AliasPair';
import { RequestService } from './RequestService';
import MainHelper from '../../shared/helpers/MainHelper';
import OneSignalApiBaseResponse from '../../shared/api/OneSignalApiBaseResponse';
import Log from '../../shared/libraries/Log';

/**
 * This class contains logic for all the UserProperty model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class UserPropertyRequests {
  static async updateUserProperties<Model>(
    operation: Operation<Model>,
  ): Promise<ExecutorResult<UserPropertiesModel>> {
    logMethodCall('UserPropertyRequests.updateUserProperties', operation);

    const propertiesModel = operation.model;
    const properties = propertiesModel?.data;

    if (!properties || !propertiesModel) {
      throw new OneSignalError(
        `updateUserProperty: bad identity model: ${propertiesModel}`,
      );
    }

    if (!propertiesModel.onesignalId) {
      Log.info('Caching User Property update until subscription is created.');
      return new ExecutorResultFailNotRetriable();
    }

    const aliasPair = new AliasPair(
      AliasPair.ONESIGNAL_ID,
      propertiesModel.onesignalId,
    );

    const appId = await MainHelper.getAppId();
    const response = await RequestService.updateUser({ appId }, aliasPair, {
      properties,
    });
    return UserPropertyRequests._processUserPropertyResponse(response);
  }

  private static _processUserPropertyResponse(
    response?: OneSignalApiBaseResponse,
  ): ExecutorResult<UserPropertiesModel> {
    if (!response) {
      throw new Error('processUserPropertyResponse: response is not defined');
    }

    const { status, result } = response;

    if (status >= 200 && status < 300) {
      return new ExecutorResultSuccess(result?.properties);
    }

    if (status >= 400 && status < 500) {
      return new ExecutorResultFailNotRetriable();
    }

    return new ExecutorResultFailRetriable();
  }
}
