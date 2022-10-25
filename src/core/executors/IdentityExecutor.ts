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

    const addAndUpdatedDeltas: PropertyDelta<SupportedModel>[] = [];
    const removeDeltas: PropertyDelta<SupportedModel>[] = [];

    this._deltaQueue.forEach(delta => {
      if (!isPropertyDelta(delta)) {
        return;
      }

      const deltaChangeType = this._getChangeType(delta.oldValue, delta.newValue);

      if (deltaChangeType === CoreChangeType.Add || deltaChangeType === CoreChangeType.Update) {
        addAndUpdatedDeltas.push(delta);
      } else if (deltaChangeType === CoreChangeType.Remove) {
        removeDeltas.push(delta);
      }
    });

    if (addAndUpdatedDeltas.length > 0) {
      this._enqueueOperation(
        new Operation<SupportedModel>(CoreChangeType.Add, ModelName.Identity, addAndUpdatedDeltas)
        );
    }
    if (removeDeltas.length > 0) {
      this._enqueueOperation(new Operation(CoreChangeType.Remove, ModelName.Identity, removeDeltas));
    }

    this._flushDeltas();
  }
}
