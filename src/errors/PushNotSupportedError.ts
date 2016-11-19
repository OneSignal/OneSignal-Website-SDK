import OneSignalError from "./OneSignalError";
import * as Browser from 'bowser';


export default class PushNotSupportedError extends OneSignalError {
  constructor() {
    super('Push notifications are not supported.');
  }
}