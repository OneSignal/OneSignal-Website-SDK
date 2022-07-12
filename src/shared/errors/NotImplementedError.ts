import OneSignalError from "./OneSignalError";


export default class NotImplementedError extends OneSignalError {
  constructor() {
    super('This code is not implemented yet.');

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
