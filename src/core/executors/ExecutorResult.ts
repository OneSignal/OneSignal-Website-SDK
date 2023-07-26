export default interface ExecutorResult<Model> {
  readonly success: boolean,
  readonly retriable: boolean,
  readonly result?: Model
}

export class ExecutorResultSuccess<Model> implements ExecutorResult<Model> {
  success = true;
  retriable = false;
  constructor(readonly result?: Model) {

  }
}

export class ExecutorResultFailRetriable<Model> implements ExecutorResult<Model> {
  success = false;
  retriable = true;
  constructor(readonly result?: Model) {

  }
}

export class ExecutorResultFailNotRetriable<Model> implements ExecutorResult<Model> {
  success = false;
  retriable = false;
  constructor(readonly result?: Model) {

  }
}
