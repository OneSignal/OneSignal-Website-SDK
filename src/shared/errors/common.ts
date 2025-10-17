import type { DelayedPromptTypeValue } from '../prompts/types';
import { InvalidChannelInputField } from './constants';
import type { InvalidChannelInputFieldValue } from './types';

export class SWRegistrationError extends Error {
  public readonly status: number;
  public readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`Registration of a Service Worker failed.`);
    this.status = status;
    this.statusText = statusText;
  }
}

export class ChannelCaptureError extends Error {
  reason: InvalidChannelInputFieldValue;

  constructor(invalidChannelInput: InvalidChannelInputFieldValue) {
    let errorMessage;
    switch (invalidChannelInput) {
      case InvalidChannelInputField._InvalidEmail:
        errorMessage = `Invalid email`;
        break;
      case InvalidChannelInputField._InvalidSms:
        errorMessage = `Invalid sms`;
        break;
      case InvalidChannelInputField._InvalidEmailAndSms:
        errorMessage = `Invalid email & sms`;
        break;
    }
    super(errorMessage);
    this.reason = invalidChannelInput;
  }
}

export const AppIDMissingError = new Error('Missing app ID');

export const RetryLimitError = new Error('Retry limit reached');

export const PermissionBlockedError = new Error('Permission blocked');

export const InvalidAppIdError = new Error("AppID doesn't match existing apps");

export const SdkAlreadyInitializedError = new Error('SDK already initialized');

export const MissingSafariWebIdError = new Error(
  'Safari web platform must be enabled',
);

export const ExistingChannelError = (type: DelayedPromptTypeValue) =>
  new Error(`Channel '${type}' already exists`);

export const EmptyArgumentError = (argName: string) =>
  new Error(`"${argName}" is empty`);

export const MalformedArgumentError = (argName: string) =>
  new Error(`"${argName}" is malformed`);

export const EnumOutOfRangeArgumentError = (argName: string) =>
  new Error(`"${argName}" is out of range`);

export const WrongTypeArgumentError = (argName: string) =>
  new Error(`"${argName}" is the wrong type`);

export const ReservedArgumentError = (argName: string) =>
  new Error(`"${argName}" is reserved`);
