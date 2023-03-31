import OneSignalError from "./OneSignalError";

export enum InvalidArgumentReason {
  Empty,
  Malformed,
  EnumOutOfRange,
  WrongType
}

export class InvalidArgumentError extends OneSignalError {
  argument: string;
  reason: string;

  constructor(argName: string, reason: InvalidArgumentReason, message?: string) {
    let errorMessage;
    switch (reason) {
      case InvalidArgumentReason.Empty:
        errorMessage = `Supply a non-empty value to '${argName}'. ${message}`;
        break;
      case InvalidArgumentReason.Malformed:
        errorMessage = `The value for '${argName}' was malformed. ${message}`;
        break;
      case InvalidArgumentReason.EnumOutOfRange:
        errorMessage = `The value for '${argName}' was out of range of the expected input enum. ${message}`;
        break;
      case InvalidArgumentReason.WrongType:
        errorMessage = `The value for '${argName}' was of the wrong type. ${message}`;
        break;
    }

    super(errorMessage);
    this.argument = argName;
    this.reason = InvalidArgumentReason[reason];

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, InvalidArgumentError.prototype);
  }
}
