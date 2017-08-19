import OneSignalError from './OneSignalError';

export default class ServiceUnavailableError extends OneSignalError {
  constructor(public description: string) {
    super(`The OneSignal service is temporarily unavailable. ${description}`);
  }
}
