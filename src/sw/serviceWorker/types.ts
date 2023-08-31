export interface OSWindowClient extends WindowClient {
  isSubdomainIframe: boolean;
}

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
