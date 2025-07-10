export interface ICustomEvent {
  externalId?: string;
  name: string;
  onesignalId?: string;
  properties?: Record<string, unknown>;
  sdk: string;
  timestamp: number;
}

export interface ICustomEventController {
  /**
   * Enqueue an custom event with optional properties to send to the backend.
   * The event will be sent immediately if a backend onesignal ID is present; otherwise, it will
   *  be saved into a queue and will be sent once the onesignal ID is fetched
   */
  enqueueCustomEvent(name: string, properties?: Record<string, unknown>): void;
}

// Request
export interface ICustomEventRequestItem {
  name: string;
  external_id?: string;
  onesignal_id: string;
  timestamp: number;
  payload: Record<string, unknown>;
}
export interface ICustomEventRequest {
  events: ICustomEventRequestItem[];
}
