import Log from "../../shared/libraries/Log";
import { logMethodCall } from "../../shared/utils/utils";
import { ModelName, SupportedModel } from "../models/SupportedModels";
import { Operation } from "../operationRepo/Operation";

export default class OperationCache {
  static enqueue<Model>(operation: Operation<Model>): void {
    logMethodCall("OperationCache.enqueue", { operation });
    const fromCache = localStorage.getItem("operationCache");
    const operations: { [key: string]: any } = fromCache ? JSON.parse(fromCache) : {};
    operations[operation.operationId] = operation;
    localStorage.setItem("operationCache", JSON.stringify(operations));
  }

  static getOperationsWithModelName(modelName: ModelName): Operation<SupportedModel>[] {
    logMethodCall("OperationCache.getOperations");
    const fromCache = localStorage.getItem("operationCache");
    const rawOperations: Operation<SupportedModel>[] = fromCache ? Object.values(JSON.parse(fromCache)) : [];
    const operations: Operation<SupportedModel>[] = [];

    for (let i = 0; i < rawOperations.length; i++) {
      const rawOperation = rawOperations[i];

      try {
        // return an operation object with correct references (in particular reference to the model)
        const operation = Operation.getInstanceWithModelReference(rawOperation);

        if (operation) {
          operations.push(operation as Operation<SupportedModel>);
        }
      } catch (e) {
        Log.warn(`Could not parse operation ${rawOperation.operationId} from cache`, e);
        this.delete(rawOperation.operationId);
      }
    }
    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);
    return sorted.filter(operation => operation.modelName === modelName);
  }

  static delete(id: string): void {
    logMethodCall("OperationCache.delete", { id });
    const fromCache = localStorage.getItem("operationCache");
    const operations: { [key: string]: any } = fromCache ? JSON.parse(fromCache) : {};
    delete operations[id];
    localStorage.setItem("operationCache", JSON.stringify(operations));
  }

  static flushOperations(): void {
    logMethodCall("OperationCache.flushOperations");
    localStorage.removeItem("operationCache");
  }
}
