import { ModelName, SupportedModel } from "../models/SupportedModels";
import OSExecutor from "./ExecutorBase";
import { EXECUTOR_CONFIG_MAP } from "./ExecutorConfigMap";
import { ExecutorFactory } from "./ExecutorFactory";

type ExecutorStoreInterface = {
  [key in ModelName]?: OSExecutor<SupportedModel>;
};

export class ExecutorStore implements ExecutorStoreInterface {
  [key: string]: OSExecutor<SupportedModel>;

  constructor() {
    Object.values(ModelName).forEach(modelName => {
      const config = EXECUTOR_CONFIG_MAP[modelName as ModelName];
      this[modelName] = ExecutorFactory.build(config);
    });
  }
}
