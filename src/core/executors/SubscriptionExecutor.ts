import OperationCache from '../caching/OperationCache';
import { CoreChangeType } from '../models/CoreChangeType';
import { CoreDelta } from '../models/CoreDeltas';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { Operation } from '../operationRepo/Operation';
import ExecutorBase from './ExecutorBase';

export class SubscriptionExecutor extends ExecutorBase {
  constructor(executorConfig: ExecutorConfig<SupportedModel>) {
    super(executorConfig);
  }

  processDeltaQueue(): void {
    const modelSpecificDeltasArrays = this.separateDeltasByModelId();

    modelSpecificDeltasArrays.forEach((deltasArray) => {
      const changeSpecificDeltas = this.separateDeltasByChangeType(deltasArray);

      Object.keys(changeSpecificDeltas).forEach((changeType: string) => {
        const deltas = changeSpecificDeltas[changeType];
        if (deltas.length > 0) {
          this._enqueueOperation(
            new Operation(
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

  getOperationsFromCache(): Operation<SupportedModel>[] {
    const smsOperations = OperationCache.getOperationsWithModelName(
      ModelName.SmsSubscriptions,
    );
    const emailOperations = OperationCache.getOperationsWithModelName(
      ModelName.EmailSubscriptions,
    );
    const pushSubOperations = OperationCache.getOperationsWithModelName(
      ModelName.PushSubscriptions,
    );

    return [...smsOperations, ...emailOperations, ...pushSubOperations];
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
