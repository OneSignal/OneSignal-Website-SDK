import MainHelper from "../../shared/helpers/MainHelper";
import OneSignalError from "../../shared/errors/OneSignalError";
import { logMethodCall } from "../../shared/utils/utils";
import ExecutorResult from "../executors/ExecutorResult";
import { SupportedSubscription } from "../models/SubscriptionModels";
import { Operation } from "../operationRepo/Operation";
import { processSubscriptionOperation } from "./helpers";
import { RequestService } from "./RequestService";

/**
 * This class contains logic for all the Subscription model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class SubscriptionRequests {
  static async addSubscription<Model>(operation: Operation<Model>): Promise<ExecutorResult<SupportedSubscription>> {
    logMethodCall("SubscriptionRequests.addSubscription", operation);

    const appId = await MainHelper.getAppId();
    const { subscription, aliasPair } = processSubscriptionOperation(operation);

    const response = await RequestService.createSubscription({ appId }, aliasPair, subscription);
    return SubscriptionRequests._processSubscriptionResponse(response);
  }

  static async removeSubscription<Model>(operation: Operation<Model>): Promise<ExecutorResult<SupportedSubscription>> {
    logMethodCall("SubscriptionRequests.removeSubscription", operation);

    const { subscriptionId } = processSubscriptionOperation(operation);

    if (!subscriptionId) {
      throw new OneSignalError("removeSubscription: subscriptionId is not defined");
    }
    const appId = await MainHelper.getAppId();

    const response = await RequestService.deleteSubscription({ appId }, subscriptionId);
    return SubscriptionRequests._processSubscriptionResponse(response);
  }

  static async updateSubscription<Model>(operation: Operation<Model>): Promise<ExecutorResult<SupportedSubscription>> {
    logMethodCall("SubscriptionRequests.updateSubscription", operation);

    const { subscription, subscriptionId } = processSubscriptionOperation(operation);

    if (!subscriptionId) {
      throw new OneSignalError("updateSubscription: subscriptionId is not defined");
    }
    const appId = await MainHelper.getAppId();

    const response = await RequestService.updateSubscription({ appId }, subscriptionId, subscription);
    return SubscriptionRequests._processSubscriptionResponse(response);
  }

  private static _processSubscriptionResponse(response?: any): ExecutorResult<SupportedSubscription> {
    if (!response) {
      throw new Error("processSubscriptionResponse: response is not defined");
    }

    const { status, result } = response;

    if (status >= 200 && status < 300) {
      return new ExecutorResult(true, true, result);
    }
    return new ExecutorResult(false, true);
  }
}
