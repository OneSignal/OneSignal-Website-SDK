import { CoreChangeType } from "../models/CoreChangeType";
import { CoreDelta } from "../models/CoreDeltas";
import { ExecutorConfig } from "../models/ExecutorConfig";
import { SupportedModel } from "../models/SupportedModels";
import { Operation } from "../operationRepo/Operation";
import { isModelDelta } from "../utils/typePredicates";
import ExecutorBase from "./ExecutorBase";

export class SubscriptionExecutor extends ExecutorBase {
  constructor(executorConfig: ExecutorConfig<SupportedModel>) {
    super(executorConfig);
  }

  public processDeltaQueue(): void {
    const modelSpecificDeltasArrays = this.separateDeltasByModelId();

    modelSpecificDeltasArrays.forEach(deltasArray => {
      const changeSpecificDeltas: IndexableByString<any> = this.separateDeltasByChangeType(deltasArray);

      Object.keys(changeSpecificDeltas).forEach((changeType: string) => {
        const deltas = changeSpecificDeltas[changeType];
        if (deltas.length > 0) {
          this._enqueueOperation(new Operation(changeType as CoreChangeType, deltas[0].model.modelName, deltas));
        }
      });
    });

    this._flushDeltas();
  }

  private separateDeltasByChangeType(deltas: CoreDelta<SupportedModel>[]):
    { [key: string]: CoreDelta<SupportedModel>[] } {
      const deltasByChangeType: Partial<{[key in CoreChangeType]: CoreDelta<SupportedModel>[]}> = {
        [CoreChangeType.Add]: [],
        [CoreChangeType.Remove]: [],
        [CoreChangeType.Update]: []
      };

      deltas.forEach(delta => {
        if (!deltasByChangeType[delta.changeType]) {
          deltasByChangeType[delta.changeType] = [];
        }
        deltasByChangeType[delta.changeType]?.push(delta);
      });

      return deltasByChangeType;
    }

  private separateDeltasByModelId(): CoreDelta<SupportedModel>[][] {
    const deltasByModelId: {[key: string]: CoreDelta<SupportedModel>[]} = {};

    this._deltaQueue.forEach(delta => {
      if (!isModelDelta(delta)) {
        return;
      }

      const modelId = delta.model.modelId;

      if (!deltasByModelId[modelId]) {
        deltasByModelId[modelId] = [];
      }

      deltasByModelId[modelId].push(delta);
    });

    return Object.values(deltasByModelId);
  }
}
