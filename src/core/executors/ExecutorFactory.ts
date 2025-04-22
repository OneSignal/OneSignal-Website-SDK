import { NewRecordsState } from '../../shared/models/NewRecordsState';
import { Executor } from '../models/Executor';
import { ExecutorConfig } from '../models/ExecutorConfig';
import { ModelName, SupportedModel } from '../models/SupportedModels';
import { IdentityExecutor } from './IdentityExecutor';
import { PropertiesExecutor } from './PropertiesExecutor';
import { SubscriptionExecutor } from './SubscriptionExecutor';

// TODO: Remove this with later Web SDK Prs
export class ExecutorFactory {
  static build(
    executorConfig: ExecutorConfig<SupportedModel>,
    newRecordsState: NewRecordsState,
  ): Executor {
    switch (executorConfig.modelName) {
      case ModelName.Identity:
        return new IdentityExecutor(executorConfig, newRecordsState);
      case ModelName.Properties:
        return new PropertiesExecutor(executorConfig, newRecordsState);
      case ModelName.Subscriptions:
        return new SubscriptionExecutor(executorConfig, newRecordsState);
    }
  }
}
