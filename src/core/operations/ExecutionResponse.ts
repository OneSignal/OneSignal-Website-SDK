import { ExecutionResultValue } from 'src/types/operation';
import { type Operation } from './Operation';

export class ExecutionResponse {
  /**
   * The result of the execution
   */
  result: ExecutionResultValue;

  /**
   * The map of id translations that should be applied to any outstanding operations.
   * Within the map the key is the local Id, the value is the remote Id.
   */
  idTranslations?: Record<string, string>;

  /**
   * When specified, any operations that should be prepended to the operation repo.
   */
  operations?: Operation[];

  /**
   * Optional Integer value maybe returned from the backend.
   * The module handing this should delay any future requests by this time.
   */
  retryAfterSeconds?: number;

  constructor(
    result: ExecutionResultValue,
    retryAfterSeconds?: number,
    operations?: Operation[],
    idTranslations?: Record<string, string>,
  ) {
    this.result = result;
    this.retryAfterSeconds = retryAfterSeconds;
    this.operations = operations;
    this.idTranslations = idTranslations;
  }
}
