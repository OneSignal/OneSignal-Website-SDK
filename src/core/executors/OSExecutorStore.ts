import { ModelName, SupportedModel } from "../models/SupportedModels";
import OSExecutor from "./OSExecutorBase";
import { OS_EXECUTOR_CONFIG_MAP } from "./OSExecutorConfigMap";
import { OSExecutorFactory } from "./OSExecutorFactory";

type OSExecutorStoreInterface = {
  [key in ModelName]?: OSExecutor<SupportedModel>;
};

export class OSExecutorStore implements OSExecutorStoreInterface {
  [key: string]: OSExecutor<SupportedModel>;

  constructor() {
    Object.values(ModelName).forEach(modelName => {
      const config = OS_EXECUTOR_CONFIG_MAP[modelName as ModelName];
      this[modelName] = OSExecutorFactory.build(config);
    });
  }
}
