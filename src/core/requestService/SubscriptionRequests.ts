import { logMethodCall } from "../../shared/utils/utils";
import ExecutorResult from "../executors/ExecutorResult";
import { Operation } from "../operationRepo/Operation";
import { processSubscriptionOperation } from "./helpers";
import { RequestService } from "./RequestService";

/**
 * This class contains logic for all the Subscription model related requests that can be made to the OneSignal API
 * These static functions are what are ultimately invoked by the operation processing logic in the Executor class
 */
export default class SubscriptionRequests {
  static async addSubscription<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    logMethodCall("SubscriptionRequests.addSubscription", operation);

    const { subscription, aliasPair } = processSubscriptionOperation(operation);

    try {
      const result = await RequestService.createSubscription(aliasPair, subscription);

      return new ExecutorResult(true, true, result);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }

  static async removeSubscription<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    logMethodCall("SubscriptionRequests.removeSubscription", operation);

    const { subscriptionId } = processSubscriptionOperation(operation);

    try {
      await RequestService.deleteSubscription(subscriptionId);

      return new ExecutorResult(true, true);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }

  static async updateSubscription<Model>(operation: Operation<Model>): Promise<ExecutorResult> {
    logMethodCall("SubscriptionRequests.updateSubscription", operation);

    const { subscription, subscriptionId } = processSubscriptionOperation(operation);

    try {
      const result = await RequestService.updateSubscription(subscriptionId, subscription);

      return new ExecutorResult(true, true, result);
    } catch (e) {
      return new ExecutorResult(false, true);
    }
  }
}
