import { NewRecordsState } from '../../shared/models/NewRecordsState';
import { ModelName } from '../models/SupportedModels';
import OSExecutor from './ExecutorBase';
import { EXECUTOR_CONFIG_MAP } from './ExecutorConfigMap';
import { ExecutorFactory } from './ExecutorFactory';

type ExecutorStoreInterface = {
  [key in ModelName]?: OSExecutor;
};

// TODO: Remove this with later Web SDK Prs
export class ExecutorStore {
  store: ExecutorStoreInterface = {};

  constructor(newRecordsState: NewRecordsState) {
    Object.values(ModelName).forEach((modelName) => {
      const config = EXECUTOR_CONFIG_MAP[modelName as ModelName];
      this.store[modelName] = ExecutorFactory.build(config, newRecordsState);
    });
  }

  // call processDeltaQueue on all executors immediately
  public forceDeltaQueueProcessingOnAllExecutors(): void {
    Object.values(this.store).forEach((executor) => {
      executor.processDeltaQueue();
    });
  }
}
