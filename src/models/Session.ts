import { SerializedPushDeviceRecord } from "../models/PushDeviceRecord";

export enum SessionStatus {
  Active = "active",
  Inactive = "inactive",
  Expired = "expired"
}

export enum SessionOrigin {
  PlayerCreate = 1,
  PlayerOnSession = 2,
  VisibilityVisible = 3,
  VisibilityHidden = 4,
  BeforeUnload = 5,
  PageRefresh = 6,
  Focus = 7,
  Blur = 8,
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

export function initializeNewSession(options?: Partial<Session>): Session {
  const currentTimestamp = new Date().getTime();
  const sessionKey = options && options.sessionKey || ONESIGNAL_SESSION_KEY;
  const notificationId = options && options.notificationId || null;

  return {
    sessionKey,
    startTimestamp: currentTimestamp,
    accumulatedDuration: 0,
    notificationId,
    status: SessionStatus.Active,
    lastDeactivatedTimestamp: null,
    lastActivatedTimestamp: currentTimestamp,
  }
}

interface BaseSessionPayload {
  deviceId?: string;
  sessionThreshold: number;
  enableSessionDuration: boolean;
  sessionOrigin: SessionOrigin;
}

export interface UpsertSessionPayload extends BaseSessionPayload {
  deviceRecord: SerializedPushDeviceRecord;
}

export interface DeactivateSessionPayload extends BaseSessionPayload {
  deviceRecord?: SerializedPushDeviceRecord;
}
