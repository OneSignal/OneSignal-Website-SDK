import { NewRecordsState } from '../../shared/models/NewRecordsState';
import OperationCache from '../caching/OperationCache';
import { CoreChangeType } from '../models/CoreChangeType';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { LegacyOperation } from '../operationRepo/LegacyOperation';
import ExecutorBase from './ExecutorBase';

// TODO: Remove this with later Web SDK Prs
export class PropertiesExecutor extends ExecutorBase {
  constructor(
    executorConfig: ExecutorConfig<SupportedModel>,
    newRecordsState: NewRecordsState,
  ) {
    super(executorConfig, newRecordsState);
  }

  processDeltaQueue(): void {
    if (this._deltaQueue.length === 0) {
      return;
    }

    this._enqueueOperation(
      new LegacyOperation(
        CoreChangeType.Update,
        ModelName.Properties,
        this._deltaQueue,
      ),
    );
    this._flushDeltas();
  }

  getOperationsFromCache(): LegacyOperation<SupportedModel>[] {
    return OperationCache.getOperationsWithModelName(ModelName.Properties);
  }
}
