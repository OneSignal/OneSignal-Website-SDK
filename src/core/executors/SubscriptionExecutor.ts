import OperationCache from '../caching/OperationCache';
import { CoreChangeType } from '../models/CoreChangeType';
import { CoreDelta } from '../models/CoreDeltas';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { LegacyOperation } from '../operationRepo/LegacyOperation';
import { NewRecordsState } from '../operationRepo/NewRecordsState';
import ExecutorBase from './ExecutorBase';

// TODO: Remove this with later Web SDK Prs
export class SubscriptionExecutor extends ExecutorBase {
  constructor(
    executorConfig: ExecutorConfig<SupportedModel>,
    newRecordsState: NewRecordsState,
  ) {
    super(executorConfig, newRecordsState);
  }

  processDeltaQueue(): void {
    const modelSpecificDeltasArrays = this.separateDeltasByModelId();

    modelSpecificDeltasArrays.forEach((deltasArray) => {
      const changeSpecificDeltas = this.separateDeltasByChangeType(deltasArray);

      Object.keys(changeSpecificDeltas).forEach((changeType: string) => {
        const deltas = changeSpecificDeltas[changeType];
        if (deltas.length > 0) {
          this._enqueueOperation(
            new LegacyOperation(
              changeType as CoreChangeType,
              deltas[0].model.modelName,
              deltas,
            ),
          );
        }
      });
    });

    this._flushDeltas();
  }

  getOperationsFromCache(): LegacyOperation<SupportedModel>[] {
    return OperationCache.getOperationsWithModelName(ModelName.Subscriptions);
  }

  private separateDeltasByChangeType(deltas: CoreDelta<SupportedModel>[]): {
    [key: string]: CoreDelta<SupportedModel>[];
  } {
    const deltasByChangeType: Partial<{
      [key in CoreChangeType]: CoreDelta<SupportedModel>[];
    }> = {
      [CoreChangeType.Add]: [],
      [CoreChangeType.Remove]: [],
      [CoreChangeType.Update]: [],
    };

    deltas.forEach((delta) => {
      if (!deltasByChangeType[delta.changeType]) {
        deltasByChangeType[delta.changeType] = [];
      }
      deltasByChangeType[delta.changeType]?.push(delta);
    });

    return deltasByChangeType;
  }

  private separateDeltasByModelId(): CoreDelta<SupportedModel>[][] {
    const deltasByModelId: { [key: string]: CoreDelta<SupportedModel>[] } = {};

    this._deltaQueue.forEach((delta) => {
      const { modelId } = delta.model;

      if (!deltasByModelId[modelId]) {
        deltasByModelId[modelId] = [];
      }

      deltasByModelId[modelId].push(delta);
    });

    return Object.values(deltasByModelId);
  }
}
