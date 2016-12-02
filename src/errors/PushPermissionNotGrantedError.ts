import OneSignalError from "./OneSignalError";


export default class PushPermissionNotGrantedError extends OneSignalError {
  constructor() {
    super(`The push notification permission was not granted.`);
  }
}