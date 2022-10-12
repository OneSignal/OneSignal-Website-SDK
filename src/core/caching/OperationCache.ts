import { Operation } from "../operationRepo/Operation";

export default class OperationCache {
  static enqueue<Model>(operation: Operation<Model>): void {
    const fromCache = localStorage.getItem("operationCache");
    const operations: { [key: string]: any } = fromCache ? JSON.parse(fromCache) : {};
    operations[operation.operationId] = operation;
    localStorage.setItem("operationCache", JSON.stringify(operations));
  }

  static getOperations<Model>(): Operation<Model>[] {
    const fromCache = localStorage.getItem("operationCache");
    const operations: Operation<Model>[] = fromCache ? Object.values(JSON.parse(fromCache)) : [];
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  static delete(id: string): void {
    const fromCache = localStorage.getItem("operationCache");
    const operations: { [key: string]: any } = fromCache ? JSON.parse(fromCache) : {};
    delete operations[id];
    localStorage.setItem("operationCache", JSON.stringify(operations));
  }

  static flushOperations(): void {
    localStorage.removeItem("operationCache");
  }
}
