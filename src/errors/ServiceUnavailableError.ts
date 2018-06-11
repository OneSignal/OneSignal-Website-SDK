import OneSignalError from './OneSignalError';

export default class ServiceUnavailableError extends OneSignalError {
  constructor(public description: string) {
    super(`The OneSignal service is temporarily unavailable. ${description}`);

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}
