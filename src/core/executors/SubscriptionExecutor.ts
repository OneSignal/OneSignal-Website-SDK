import { CoreChangeType } from "../models/CoreChangeType";
import { CoreDelta } from "../models/CoreDeltas";
import { ExecutorConfig } from "../models/ExecutorConfig";
import { Operation } from "../operationRepo/Operation";
import { isModelDelta } from "../utils/typePredicates";
import ExecutorBase from "./ExecutorBase";

export class SubscriptionExecutor<Model> extends ExecutorBase<Model> {
  constructor(executorConfig: ExecutorConfig<Model>) {
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

  private separateDeltasByChangeType(deltas: CoreDelta<Model>[]): { [key: string]: CoreDelta<Model>[] } {
    const deltasByChangeType: {[key in CoreChangeType]: CoreDelta<Model>[]} = {
      [CoreChangeType.Add]: [],
      [CoreChangeType.Remove]: [],
      [CoreChangeType.Update]: []
    };

    deltas.forEach(delta => {
      if (!deltasByChangeType[delta.changeType]) {
        deltasByChangeType[delta.changeType] = [];
      }
      deltasByChangeType[delta.changeType].push(delta);
    });

    return deltasByChangeType;
  }

  private separateDeltasByModelId(): CoreDelta<Model>[][] {
    const deltasByModelId: {[key: string]: CoreDelta<Model>[]} = {};

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
