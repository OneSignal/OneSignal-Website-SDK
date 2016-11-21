import OneSignalError from "./OneSignalError";


export default class PushNotSupportedError extends OneSignalError {
  constructor(uuid) {
    super(`'${uuid}' is not a valid UUID`);
  }
}