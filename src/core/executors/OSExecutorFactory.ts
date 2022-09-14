import { OSExecutor } from "../models/OSExecutor";
import { OSExecutorConfig } from "../models/OSExecutorConfig";
import { ModelName } from "../models/SupportedModels";
import { OSIdentityExecutor } from "./OSIdentityExecutor";
import { OSPropertiesExecutor } from "./OSPropertiesExecutor";
import { OSSubscriptionExecutor } from "./OSSubscriptionExecutor";

export class OSExecutorFactory {
  static build<Model>(executorConfig: OSExecutorConfig<Model>): OSExecutor<Model> {
    switch (executorConfig.modelName) {
      case ModelName.Identity:
        return new OSIdentityExecutor(executorConfig);
      case ModelName.Properties:
        return new OSPropertiesExecutor(executorConfig);
      case ModelName.PushSubscriptions:
      case ModelName.EmailSubscriptions:
      case ModelName.SmsSubscriptions:
        return new OSSubscriptionExecutor(executorConfig);
    }
  }
}
