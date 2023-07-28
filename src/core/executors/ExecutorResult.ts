export interface ExecutorResult<Model> {
  readonly success: boolean,
  readonly retriable: boolean,
  readonly result?: Model
}

export class ExecutorResultSuccess<Model> implements ExecutorResult<Model> {
  readonly success = true;
  readonly retriable = false;
  constructor(readonly result?: Model) {

  }
}

export class ExecutorResultFailRetriable<Model> implements ExecutorResult<Model> {
  readonly success = false;
  readonly retriable = true;
  constructor(readonly result?: Model) {

  }
}

export class ExecutorResultFailNotRetriable<Model> implements ExecutorResult<Model> {
  readonly success = false;
  readonly retriable = false;
  constructor(readonly result?: Model) {

  }
}
