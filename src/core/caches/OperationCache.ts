import Database from '../../shared/services/Database';
import { Operation } from '../types';

export default class OperationCache {
  static async put(operation: Operation): Promise<void> {
    const operations: Operation[] = await OperationCache.getAll();
    await Database.put("Operations", [...(operations || []), operation]);
  }

  static async getAll(): Promise<Operation[]> {
    return Database.get("Operations");
  }

  static async delete(operationId: string): Promise<void> {
    const operations: Operation[] = await OperationCache.getAll();
    const newOperations = operations.filter(operation => operation.operationId !== operationId);
    await Database.put("Operations", newOperations);
  }
}