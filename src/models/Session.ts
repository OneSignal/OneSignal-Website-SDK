export enum SessionStatus {
  Active = "active",
  Inactive = "inactive",
  Expired = "expired"
}

export interface Session {
  sessionKey: string;
  startTimestamp: number;
  accumulatedDuration: number;
  notificationId: string | null; // for direct clicks
  status: SessionStatus,
  lastDeactivatedTimestamp: number | null;
  lastActivatedTimestamp: number;
}

export const ONESIGNAL_SESSION_KEY = "oneSignalSession";
