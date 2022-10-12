import OperationCache from "../caching/OperationCache";
import { CoreChangeType } from "../models/CoreChangeType";
import { CoreDelta } from "../models/CoreDeltas";
import { ExecutorResult } from "../models/ExecutorResult";
import { ExecutorConfig } from "../models/ExecutorConfig";
import { Operation } from "../operationRepo/Operation";
import { logMethodCall } from "../../shared/utils/utils";
import { SupportedModel } from "../models/SupportedModels";

export default abstract class ExecutorBase {
  protected _deltaQueue: CoreDelta<SupportedModel>[] = [];
  protected _operationQueue: Operation<SupportedModel>[] = [];

  protected _executeAdd?: (operation: Operation<SupportedModel>) => ExecutorResult;
  protected _executeUpdate?: (operation: Operation<SupportedModel>) => ExecutorResult;
  protected _executeRemove?: (operation: Operation<SupportedModel>) => ExecutorResult;

  static DELTAS_BATCH_PROCESSING_TIME = 1;
  static OPERATIONS_BATCH_PROCESSING_TIME = 5;

  constructor(executorConfig: ExecutorConfig<SupportedModel>) {
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

  public enqueueDelta(delta: CoreDelta<SupportedModel>): void {
    logMethodCall("ExecutorBase.enqueueDelta", { delta });
    this._deltaQueue.push(delta);
  }

  public get deltaQueue(): CoreDelta<SupportedModel>[] {
    return this._deltaQueue;
  }

  public get operationQueue(): Operation<SupportedModel>[] {
    return this._operationQueue;
  }

  protected _enqueueOperation(operation: Operation<SupportedModel>): void {
    logMethodCall("ExecutorBase.enqueueOperation", { operation });
    this._operationQueue.push(operation);
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

  protected async _processOperationQueue(): Promise<void> {
    const cachedOperations = await OperationCache.getOperations();
    this._operationQueue = [...cachedOperations, ...this._operationQueue];

    while (this._operationQueue.length > 0) {
      const operation = this._operationQueue.shift();

      if (operation) {
        OperationCache.enqueue(operation);
        this._processOperation(operation, 5);
      }
    }
  }

  private _processOperation(operation: Operation<SupportedModel>, retry: number): void {
    logMethodCall("ExecutorBase._processOperation", { operation, retry });
      let res: ExecutorResult = { success: false, retriable: true };

      if (operation?.changeType === CoreChangeType.Add) {
        res = this._executeAdd?.call(this, operation);
      } else if (operation?.changeType === CoreChangeType.Remove) {
        res = this._executeRemove?.call(this, operation);
      } else if (operation?.changeType === CoreChangeType.Update) {
        res = this._executeUpdate?.call(this, operation);
      }
      // HYDRATE
      if (res.success) {
        if (res.result) {
          operation.model?.hydrate(res.result as SupportedModel);
        }
        OperationCache.delete(operation?.operationId);
      } else {
        // TO DO: handle retry logic
        this._processOperation(operation, retry - 1);
      }
  }
}
