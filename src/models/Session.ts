export enum SessionStatus {
  Active = "active",
  Inactive = "inactive",
  Expired = "expired"
}

export interface Session {
  sessionKey: string;
  appId: string;
  deviceId: string;
  deviceType: number;
  startTimestamp: number;
  accumulatedDuration: number;
  notificationId: string | null; // for direct clicks
  status: SessionStatus,
  lastDeactivatedTimestamp: number | null;
  lastActivatedTimestamp: number;
}

export const ONESIGNAL_SESSION_KEY = "oneSignalSession";

export function initializeNewSession(
  options: Partial<Session> & { deviceId: string; appId: string, deviceType: number; }
): Session {
  const currentTimestamp = new Date().getTime();
  const sessionKey = options && options.sessionKey || ONESIGNAL_SESSION_KEY;
  const notificationId = options && options.notificationId || null;

  return {
    sessionKey,
    appId: options.appId,
    deviceId: options.deviceId,
    deviceType: options.deviceType,
    startTimestamp: currentTimestamp,
    accumulatedDuration: 0,
    notificationId,
    status: SessionStatus.Active,
    lastDeactivatedTimestamp: null,
    lastActivatedTimestamp: currentTimestamp,
  }
}