export enum SessionStatus {
  Active = "active",
  Inactive = "inactive",
  Expired = "expired"
}

export interface Session {
  sessionKey: string;
  startTimestamp: number;
  accumulatedDuration: number;
  notificationId?: string; // for direct clicks
  status: SessionStatus,
  lastActivatedTimestamp: number;
}