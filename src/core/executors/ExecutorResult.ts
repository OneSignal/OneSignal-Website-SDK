export default class ExecutorResult<Model> {
  constructor(
    readonly success: boolean,
    readonly retriable: boolean,
    readonly result?: Model
    ){}
}
