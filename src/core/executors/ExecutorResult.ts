export default class ExecutorResult {
  constructor(
    readonly success: boolean,
    readonly retriable: boolean,
    readonly result?: unknown
    ){}
}
