import { ICustomEvent } from '../types/events';

export class CustomWebEvent implements ICustomEvent {
  name: string;
  properties?: Record<string, unknown>;
  onesignalId: string;
  externalId?: string;
  timestamp: number;
  sdk: string;

  constructor({
    externalId,
    name,
    onesignalId,
    properties,
    sdk,
    timestamp,
  }: {
    externalId: string | undefined;
    name: string;
    onesignalId: string;
    properties?: Record<string, unknown>;
    sdk: string;
    timestamp: number;
  }) {
    this.name = name;
    this.properties = properties;
    this.onesignalId = onesignalId;
    this.externalId = externalId;
    this.sdk = sdk;
    this.timestamp = timestamp;
  }

  toJSON(): Record<string, unknown> {
    const payload = {
      sdk: this.sdk,
      ...(this.properties ?? {}),
    };

    return {
      name: this.name,
      onesignal_id: this.onesignalId,
      external_id: this.externalId,
      timestamp: this.timestamp,
      payload,
    };
  }
}
