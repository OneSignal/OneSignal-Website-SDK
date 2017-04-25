import OneSignalError from "./OneSignalError";
import { PermissionPromptType } from "../models/PermissionPromptType";

export default class ServiceUnavailableError extends OneSignalError {
  constructor(public description: string) {
    super(`The OneSignal service is temporarily unavailable. ${description}`);
  }
}