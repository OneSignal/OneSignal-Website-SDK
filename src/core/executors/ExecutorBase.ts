import OperationCache from "../caching/OperationCache";
import { CoreChangeType } from "../models/CoreChangeType";
import { CoreDelta } from "../models/CoreDeltas";
import { ExecutorResult } from "../models/ExecutorResult";
import { ExecutorConfig } from "../models/ExecutorConfig";
import { Operation } from "../operationRepo/Operation";
import { logMethodCall } from "../../shared/utils/utils";

export default abstract class ExecutorBase<Model> {
  protected _deltaQueue: CoreDelta<Model>[] = [];
  protected _operationQueue: Operation<Model>[] = [];

  protected _executeAdd?: (operation: Operation<Model>) => ExecutorResult;
  protected _executeUpdate?: (operation: Operation<Model>) => ExecutorResult;
  protected _executeRemove?: (operation: Operation<Model>) => ExecutorResult;

  static DELTAS_BATCH_PROCESSING_TIME = 1;
  static OPERATIONS_BATCH_PROCESSING_TIME = 5;

  constructor(executorConfig: ExecutorConfig<Model>) {
    setInterval(() => {
      if (this._deltaQueue.length > 0) {
        this.processDeltaQueue.call(this);
      }
    }, ExecutorBase.DELTAS_BATCH_PROCESSING_TIME * 1_000);

    setInterval(() => {
      if (this._operationQueue.length > 0) {
        this._processOperationQueue.call(this);
      }
    }, ExecutorBase.OPERATIONS_BATCH_PROCESSING_TIME * 1_000);

    this._executeAdd = executorConfig.add;
    this._executeUpdate = executorConfig.update;
    this._executeRemove = executorConfig.remove;
  }

  abstract processDeltaQueue(): void;

  public enqueueDelta(delta: CoreDelta<Model>): void {
    logMethodCall("ExecutorBase.enqueueDelta", { delta });
    this._deltaQueue.push(delta);
  }

  public get deltaQueue(): CoreDelta<Model>[] {
    return this._deltaQueue;
  }

  public get operationQueue(): Operation<Model>[] {
    return this._operationQueue;
  }

  protected _enqueueOperation(operation: Operation<Model>): void {
    logMethodCall("ExecutorBase.enqueueOperation", { operation });
    this._operationQueue.push(operation);
    OperationCache.enqueue(operation);
  }

  protected _flushDeltas(): void {
    logMethodCall("ExecutorBase._flushDeltas");
    this._deltaQueue = [];
  }

  protected _flushOperations(): void {
    logMethodCall("ExecutorBase._flushOperations");
    this._operationQueue = [];
  }

  protected _getChangeType(oldValue: any, newValue: any): CoreChangeType {
    logMethodCall("ExecutorBase._getChangeType", { oldValue, newValue });
    const wasPropertyAdded = !oldValue && !!newValue;
    const wasPropertyRemoved = !!oldValue && !newValue;
    const wasPropertyUpdated = oldValue !== newValue && !!newValue && !!oldValue;

    let finalChangeType;

    if (wasPropertyAdded) {
      finalChangeType = CoreChangeType.Add;
    } else if (wasPropertyRemoved) {
      finalChangeType = CoreChangeType.Remove;
    } else if (wasPropertyUpdated) {
      finalChangeType = CoreChangeType.Update;
    } else {
      throw new Error("Unsupported change type");
    }

    return finalChangeType;
  }

  protected _processOperationQueue(): void {
    this._operationQueue = [...OperationCache.getOperations<Model>(), ...this._operationQueue];
    const clonedOperationQueue = JSON.parse(JSON.stringify(this._operationQueue));

    while (clonedOperationQueue.length > 0) {
      const operation = clonedOperationQueue.shift();
      this._operationQueue.shift(); // move in sync with clonedOperationQueue

      // tells typescript compiler that operation is not undefined to avoid TS errors below
      if (!operation) {
        continue;
      }

      let res: ExecutorResult = { success: false, retriable: true };

      if (operation?.changeType === CoreChangeType.Add) {
        res = this._executeAdd?.call(operation);
      } else if (operation?.changeType === CoreChangeType.Remove) {
        res = this._executeRemove?.call(operation);
      } else if (operation?.changeType === CoreChangeType.Update) {
        res = this._executeUpdate?.call(operation);
      }
      // HYDRATE
      if (res.success) {
        operation?.model.hydrate(res.result);
        OperationCache.delete(operation?.id);
        OperationCache.delete(operation?.operationId);
      } else {
        // TO DO: handle retry logic
        this._enqueueOperation(operation);
      }
    }
  }
}
