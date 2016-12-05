import OneSignalError from "./OneSignalError";


export default class PushNotSupportedError extends OneSignalError {
  constructor() {
    super('Push notifications are not supported.');
  }
}