import OneSignalError from "./OneSignalError";

export enum InvalidArgumentReason {
  Empty,
  Malformed,
  EnumOutOfRange
}

export class InvalidArgumentError extends OneSignalError {
  argument: string;
  reason: string;

  constructor(argName: string, reason: InvalidArgumentReason) {
    switch (reason) {
      case InvalidArgumentReason.Empty:
        super(`Supply a non-empty value to '${argName}'.`);
        break;
      case InvalidArgumentReason.Malformed:
        super(`The value for '${argName}' was malformed.`);
        break;
      case InvalidArgumentReason.EnumOutOfRange:
        super(`The value for '${argName}' was out of range of the expected input enum.`);
        break;
    }
    this.argument = argName;
    this.reason = InvalidArgumentReason[reason];
  }
}
