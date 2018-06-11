import OneSignalError from "./OneSignalError";


export default class TimeoutError extends OneSignalError {
  constructor(public message: string = "The asynchronous operation has timed out.") {
    super(message);

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
