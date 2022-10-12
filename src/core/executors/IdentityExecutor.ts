import { CoreChangeType } from "../models/CoreChangeType";
import { PropertyDelta } from "../models/CoreDeltas";
import { ExecutorConfig } from "../models/ExecutorConfig";
import { ModelName, SupportedModel } from "../models/SupportedModels";
import { Operation } from "../operationRepo/Operation";
import { isPropertyDelta } from "../utils/typePredicates";
import ExecutorBase from "./ExecutorBase";

export class IdentityExecutor extends ExecutorBase {
  constructor(executorConfig: ExecutorConfig<SupportedModel>) {
    super(executorConfig);
  }

  public processDeltaQueue(): void {
    if (this._deltaQueue.length === 0) {
      return;
    }

    const addDeltas: PropertyDelta<SupportedModel>[] = [];
    const removeDeltas: PropertyDelta<SupportedModel>[] = [];
    const updateDeltas: PropertyDelta<SupportedModel>[] = [];

    this._deltaQueue.forEach(delta => {
      if (!isPropertyDelta(delta)) {
        return;
      }

      const deltaChangeType = this._getChangeType(delta.oldValue, delta.newValue);

      if (deltaChangeType === CoreChangeType.Add) {
        addDeltas.push(delta);
      } else if (deltaChangeType === CoreChangeType.Remove) {
        removeDeltas.push(delta);
      } else if (deltaChangeType === CoreChangeType.Update) {
        updateDeltas.push(delta);
      }
    });

    if (addDeltas.length > 0) {
      this._enqueueOperation(new Operation<SupportedModel>(CoreChangeType.Add, ModelName.Identity, addDeltas));
    }
    if (removeDeltas.length > 0) {
      this._enqueueOperation(new Operation(CoreChangeType.Remove, ModelName.Identity, removeDeltas));
    }
    if (updateDeltas.length > 0) {
      this._enqueueOperation(new Operation(CoreChangeType.Update, ModelName.Identity, updateDeltas));
    }

    this._flushDeltas();
  }
}
