import { ExecutorResult } from '../executors/ExecutorResult';
import { Operation } from '../operationRepo/Operation';
import { ModelName, SupportedModel } from './SupportedModels';

export type ExecutorConfig<Model> = {
  modelName: ModelName;
  add?: (
    operation: Operation<Model>,
  ) => Promise<ExecutorResult<SupportedModel>>;
  remove?: (
    operation: Operation<Model>,
  ) => Promise<ExecutorResult<SupportedModel>>;
  update?: (
    operation: Operation<Model>,
  ) => Promise<ExecutorResult<SupportedModel>>;
};

export type ExecutorConfigMap = {
  [key in ModelName]: ExecutorConfig<SupportedModel>;
};
