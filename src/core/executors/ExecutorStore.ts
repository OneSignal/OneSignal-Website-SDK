import { ModelName } from '../models/SupportedModels';
import OSExecutor from './ExecutorBase';
import { EXECUTOR_CONFIG_MAP } from './ExecutorConfigMap';
import { ExecutorFactory } from './ExecutorFactory';
import { SubscriptionExecutor } from './SubscriptionExecutor';

type ExecutorStoreInterface = {
  [key in ModelName]?: OSExecutor;
};

export class ExecutorStore {
  store: ExecutorStoreInterface = {};

  constructor() {
    Object.values(ModelName).forEach((modelName) => {
      const config = EXECUTOR_CONFIG_MAP[modelName as ModelName];
      this.store[modelName] = ExecutorFactory.build(config);
    });
  }

  // call processDeltaQueue on all executors immediately
  public forceDeltaQueueProcessingOnAllExecutors(): void {
    let didSubscriptionExecutorProcessDeltaQueue = false;

    Object.values(this.store).forEach((executor) => {
      if (
        executor instanceof SubscriptionExecutor &&
        didSubscriptionExecutorProcessDeltaQueue
      ) {
        return;
      }

      executor.processDeltaQueue();

      if (executor instanceof SubscriptionExecutor) {
        didSubscriptionExecutorProcessDeltaQueue = true;
      }
    });
  }
}
