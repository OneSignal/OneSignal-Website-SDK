import MainHelper from 'src/shared/helpers/MainHelper';
import { ICustomEvent, ICustomEventRequestItem } from '../types/events';

export class CustomWebEvent implements ICustomEvent {
  appId: string;
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
    this.appId = MainHelper.getAppId();
    this.name = name;
    this.properties = properties;
    this.onesignalId = onesignalId;
    this.externalId = externalId;
    this.sdk = sdk;
    this.timestamp = timestamp;
  }

  updateOnesignalId(onesignalId: string) {
    this.onesignalId = onesignalId;
  }

  toJSON(): ICustomEventRequestItem {
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
