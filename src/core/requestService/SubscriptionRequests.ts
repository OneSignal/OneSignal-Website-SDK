import MainHelper from "../../shared/helpers/MainHelper";
import OneSignalError from "../../shared/errors/OneSignalError";
import { logMethodCall } from "../../shared/utils/utils";
import ExecutorResult from "../executors/ExecutorResult";
import { SupportedSubscription } from "../models/SubscriptionModels";
import { Operation } from "../operationRepo/Operation";
import { getJWTHeader, jwtExpired, processSubscriptionOperation } from "./helpers";
import { RequestService } from "./RequestService";
import OneSignalApiBaseResponse from "../../shared/api/OneSignalApiBaseResponse";
import { isCompleteSubscriptionObject } from "../utils/typePredicates";
import { SupportedModel } from "../models/SupportedModels";

/**
 * This class contains logic for all the Subscription model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class SubscriptionRequests {
  static async addSubscription(operation: Operation<SupportedModel>): Promise<ExecutorResult<SupportedSubscription>> {
    logMethodCall("SubscriptionRequests.addSubscription", operation);

    const appId = await MainHelper.getAppId();
    const jwtHeader = await getJWTHeader(operation.jwtToken);
    const { subscription, aliasPair } = processSubscriptionOperation(operation);

    const response = await RequestService.createSubscription({ appId, jwtHeader }, aliasPair, { subscription });
    return SubscriptionRequests._processSubscriptionResponse(operation, response);
  }

  static async removeSubscription(operation: Operation<SupportedModel>): Promise<ExecutorResult<SupportedSubscription>> {
    logMethodCall("SubscriptionRequests.removeSubscription", operation);

    const { subscriptionId } = processSubscriptionOperation(operation);

    if (!subscriptionId) {
      throw new OneSignalError("removeSubscription: subscriptionId is not defined");
    }
    const appId = await MainHelper.getAppId();

    const response = await RequestService.deleteSubscription({ appId }, subscriptionId);
    return SubscriptionRequests._processSubscriptionResponse(operation, response);
  }

  static async updateSubscription(operation: Operation<SupportedModel>): Promise<ExecutorResult<SupportedSubscription>> {
    logMethodCall("SubscriptionRequests.updateSubscription", operation);

    const { payload, subscriptionId } = processSubscriptionOperation(operation);

    if (!subscriptionId) {
      throw new OneSignalError("updateSubscription: subscriptionId is not defined");
    }

    if (!payload) {
      throw new OneSignalError("updateSubscription: payload is not defined");
    }

    const appId = await MainHelper.getAppId();

    const response = await RequestService.updateSubscription({ appId }, subscriptionId, payload);
    return SubscriptionRequests._processSubscriptionResponse(operation, response);
  }

  private static _processSubscriptionResponse(operation: Operation<SupportedModel>, response?: OneSignalApiBaseResponse):
    ExecutorResult<SupportedSubscription> {
      if (!response) {
        throw new Error("processSubscriptionResponse: response is not defined");
      }

      const { status, result } = response;
      const subscription = result.subscription;

      if (status >= 200 && status < 300) {
        if (subscription && !isCompleteSubscriptionObject(subscription)) {
          throw new OneSignalError(`processSubscriptionResponse: bad subscription object: ${subscription}`);
        }

        return new ExecutorResult<SupportedSubscription>(true, true, subscription);
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
