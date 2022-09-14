import OSExecutorBase from "./OSExecutorBase";
import { Operation } from "../operationRepo/Operation";
import { CoreChangeType } from "../models/CoreChangeType";
import { OSExecutorConfig } from "../models/OSExecutorConfig";
import { ModelName } from "../models/SupportedModels";

export class OSPropertiesExecutor<Model> extends OSExecutorBase<Model> {
  constructor(executorConfig: OSExecutorConfig<Model>) {
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
