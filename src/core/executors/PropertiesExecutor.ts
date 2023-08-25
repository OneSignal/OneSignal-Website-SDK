import ExecutorBase from './ExecutorBase';
import { Operation } from '../operationRepo/Operation';
import { CoreChangeType } from '../models/CoreChangeType';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import OperationCache from '../caching/OperationCache';

export class PropertiesExecutor extends ExecutorBase {
  constructor(executorConfig: ExecutorConfig<SupportedModel>) {
    super(executorConfig);
  }

  processDeltaQueue(): void {
    if (this._deltaQueue.length === 0) {
      return;
    }

    this._enqueueOperation(
      new Operation(
        CoreChangeType.Update,
        ModelName.Properties,
        this._deltaQueue,
      ),
    );
    this._flushDeltas();
  }

  getOperationsFromCache(): Operation<SupportedModel>[] {
    return OperationCache.getOperationsWithModelName(ModelName.Properties);
  }
}
