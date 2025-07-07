export interface ICustomEvent {
  externalId?: string;
  name: string;
  onesignalId?: string;
  properties?: Record<string, unknown>;
  sdk: string;
  timestamp: number;
}

export interface ICustomEventController {
  sendCustomEvent(
    name: string,
    properties?: Record<string, unknown>,
  ): Promise<void>;
}
