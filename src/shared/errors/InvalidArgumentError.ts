import OneSignalError from './OneSignalError';

export enum InvalidArgumentReason {
  Empty,
  Malformed,
  EnumOutOfRange,
  WrongType,
  Reserved,
}

export class InvalidArgumentError extends OneSignalError {
  argument: string;
  reason: string;

  constructor(argName: string, reason: InvalidArgumentReason, message = '') {
    let errorMessage;
    switch (reason) {
      case InvalidArgumentReason.Empty:
        errorMessage = `Supply a non-empty value to '${argName}'.`;
        break;
      case InvalidArgumentReason.Malformed:
        errorMessage = `The value for '${argName}' was malformed.`;
        break;
      case InvalidArgumentReason.EnumOutOfRange:
        errorMessage = `The value for '${argName}' was out of range of the expected input enum.`;
        break;
      case InvalidArgumentReason.WrongType:
        errorMessage = `The value for '${argName}' was of the wrong type.`;
        break;
      case InvalidArgumentReason.Reserved:
        errorMessage = `The value for '${argName}' is reserved.`;
        break;
    }

    if (message) errorMessage += ` ${message}`;

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
