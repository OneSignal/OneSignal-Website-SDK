import OneSignalError from "./OneSignalError";


export default class NotImplementedError extends OneSignalError {
  constructor() {
    super('This code is not implemented yet.');
  }
}
