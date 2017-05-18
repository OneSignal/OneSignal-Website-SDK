import OneSignalError from "./OneSignalError";


export default class TimeoutError extends OneSignalError {
  constructor(public message: string = "The asynchronous operation has timed out.") {
    super(message);
  }
}
