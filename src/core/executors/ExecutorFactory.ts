import { Executor } from '../models/Executor';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { IdentityExecutor } from './IdentityExecutor';
import { PropertiesExecutor } from './PropertiesExecutor';
import { SubscriptionExecutor } from './SubscriptionExecutor';

export class ExecutorFactory {
  static build(executorConfig: ExecutorConfig<SupportedModel>): Executor {
    switch (executorConfig.modelName) {
      case ModelName.Identity:
        return new IdentityExecutor(executorConfig);
      case ModelName.Properties:
        return new PropertiesExecutor(executorConfig);
      case ModelName.Subscriptions:
        return new SubscriptionExecutor(executorConfig);
    }
  }
}
