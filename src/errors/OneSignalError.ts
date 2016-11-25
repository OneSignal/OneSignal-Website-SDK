import ExtendableError from "es6-error";

export default class OneSignalError extends ExtendableError {
  constructor(message) {
    super(message);
  }
}