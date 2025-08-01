export interface ClientStatus {
  timestamp: number;
  sentRequestsCount: number;
  receivedResponsesCount: number;
  hasAnyActiveSessions: boolean;
}

export interface OSServiceWorkerFields {
  shouldLog?: boolean;
  debounceSessionTimerId?: number;
  finalizeSessionTimerId?: number;
  clientsStatus?: ClientStatus;
  cancel?: () => void;
}

export interface SubscriptionChangeEvent {
  oldSubscription: PushSubscription | null;
  newSubscription: PushSubscription | null;
}

// This is the raw payload that OneSignal sends
export interface OSMinifiedNotificationPayload {
  readonly title?: string;
  readonly alert: string;
  readonly custom: OSMinifiedCustomNotificationPayload;
  readonly icon?: string;
  readonly image?: string;
  readonly tag?: string;
  readonly badge?: string;
  readonly vibrate?: string;
  readonly o?: OSMinifiedButtonsPayload[];
}

export interface OSMinifiedCustomNotificationPayload {
  readonly i: string;
  readonly a?: any;
  readonly u?: string;
  readonly rr?: string;
}

export interface OSMinifiedButtonsPayload {
  readonly i: string;
  readonly n: string;
  readonly p?: string;
  readonly u?: string;
}

export interface IOSWebhookEventPayload {
  readonly event: string;
}
