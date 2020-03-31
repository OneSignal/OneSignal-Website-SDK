export interface OSWindowClient extends WindowClient {
  isSubdomainIframe: boolean;
}

export interface ClientStatus {
  timestamp: number;
  sentRequestsCount: number;
  receivedResponsesCount: number;
  hasAnyActiveSessions: boolean;
}

export interface PageVisibilityRequest {
  timestamp: number;
}

export interface PageVisibilityResponse extends PageVisibilityRequest {
  focused: boolean;
}

export interface OSServiceWorkerFields { 
  timerId?: number;
  clientsStatus?: ClientStatus;
}
