import { Operation } from "../operationRepo/Operation";
import { ExecutorResult } from "./ExecutorResult";
import { ModelName, SupportedModel } from "./SupportedModels";

export type OSExecutorConfig<Model> = {
  modelName: ModelName;
  add?: (operation: Operation<Model>) => ExecutorResult;
  remove?: (operation: Operation<Model>) => ExecutorResult;
  update?: (operation: Operation<Model>) => ExecutorResult;
};

export type OSExecutorConfigMap = {
  [key in ModelName]: OSExecutorConfig<SupportedModel>;
};
