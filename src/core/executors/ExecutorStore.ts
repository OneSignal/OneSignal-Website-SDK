import { ModelName } from "../models/SupportedModels";
import OSExecutor from "./ExecutorBase";
import { EXECUTOR_CONFIG_MAP } from "./ExecutorConfigMap";
import { ExecutorFactory } from "./ExecutorFactory";

type ExecutorStoreInterface = {
  [key in ModelName]?: OSExecutor;
};

export class ExecutorStore implements ExecutorStoreInterface {
  [key: string]: OSExecutor;

  constructor() {
    Object.values(ModelName).forEach(modelName => {
      const config = EXECUTOR_CONFIG_MAP[modelName as ModelName];
      this[modelName] = ExecutorFactory.build(config);
    });
  }
}
