import type { SubscriptionTypeValue } from './subscription';

export interface ICustomEvent {
  name: string;
  properties?: Record<string, unknown>;
}

export interface ICustomEventController {
  sendCustomEvent(event: ICustomEvent): void;
}

export interface ICustomEventMetadata {
  device_model: string;
  device_os: number;
  sdk: string;
  type: SubscriptionTypeValue;
}

export interface ICreateEvent {
  name: string;
  onesignal_id?: string;
  external_id?: string;
  timestamp?: string;
  payload?: {
    os_sdk?: ICustomEventMetadata;
    [key: string]: unknown;
  };
}
