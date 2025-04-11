import Log from '../../shared/libraries/Log';
import { logMethodCall } from '../../shared/utils/utils';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { LegacyOperation } from '../operationRepo/LegacyOperation';

export default class OperationCache {
  static enqueue<Model>(operation: LegacyOperation<Model>): void {
    logMethodCall('OperationCache.enqueue', { operation });
    const fromCache = localStorage.getItem('operationCache');
    const operations: { [key: string]: unknown } = fromCache
      ? JSON.parse(fromCache)
      : {};
    operations[operation.operationId] = operation;
    localStorage.setItem('operationCache', JSON.stringify(operations));
  }

  static getOperationsWithModelName(
    modelName: ModelName,
  ): LegacyOperation<SupportedModel>[] {
    const fromCache = localStorage.getItem('operationCache');
    const rawOperations: LegacyOperation<SupportedModel>[] = fromCache
      ? Object.values(JSON.parse(fromCache))
      : [];
    const operations: LegacyOperation<SupportedModel>[] = [];

    for (let i = 0; i < rawOperations.length; i++) {
      const rawOperation = rawOperations[i];

      try {
        // return an operation object with correct references (in particular reference to the model)
        const operation =
          LegacyOperation.getInstanceWithModelReference(rawOperation);

        if (operation) {
          operations.push(operation as LegacyOperation<SupportedModel>);
        }
      } catch (e) {
        Log.warn(
          `Could not parse operation ${rawOperation.operationId} from cache`,
          e,
        );
        this.delete(rawOperation.operationId);
      }
    }
    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);
    return sorted.filter((operation) => operation.modelName === modelName);
  }

  static delete(id: string): void {
    logMethodCall('OperationCache.delete', { id });
    const fromCache = localStorage.getItem('operationCache');
    const operations: { [key: string]: unknown } = fromCache
      ? JSON.parse(fromCache)
      : {};
    delete operations[id];
    localStorage.setItem('operationCache', JSON.stringify(operations));
  }

  static flushOperations(): void {
    logMethodCall('OperationCache.flushOperations');
    localStorage.removeItem('operationCache');
  }
}
