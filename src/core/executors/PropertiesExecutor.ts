import ExecutorBase from "./ExecutorBase";
import { Operation } from "../operationRepo/Operation";
import { CoreChangeType } from "../models/CoreChangeType";
import { ExecutorConfig } from "../models/ExecutorConfig";
import { ModelName } from "../models/SupportedModels";

export class PropertiesExecutor<Model> extends ExecutorBase<Model> {
  constructor(executorConfig: ExecutorConfig<Model>) {
    super(executorConfig);
  }

  public processDeltaQueue(): void {
    if (this._deltaQueue.length === 0) {
      return;
    }

    this._enqueueOperation(new Operation(CoreChangeType.Update, ModelName.Properties, this._deltaQueue));
    this._flushDeltas();
  }
}
