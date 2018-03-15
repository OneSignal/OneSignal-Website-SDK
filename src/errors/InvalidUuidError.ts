import OneSignalError from "./OneSignalError";


export default class InvalidUuidError extends OneSignalError {
  constructor(uuid) {
    super(`'${uuid}' is not a valid UUID`);
  }
}
