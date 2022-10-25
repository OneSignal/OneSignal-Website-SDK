import ExecutorResult from "../executors/ExecutorResult";
import { Operation } from "../operationRepo/Operation";
import { ModelName, SupportedModel } from "./SupportedModels";

export type ExecutorConfig<Model> = {
  modelName: ModelName;
  add?: (operation: Operation<Model>) => Promise<ExecutorResult>;
  remove?: (operation: Operation<Model>) => Promise<ExecutorResult>;
  update?: (operation: Operation<Model>) => Promise<ExecutorResult>;
};

export type ExecutorConfigMap = {
  [key in ModelName]: ExecutorConfig<SupportedModel>;
};
