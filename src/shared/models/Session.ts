import { DeliveryPlatformKind } from "./DeliveryPlatformKind";
import { DeviceRecord } from "./DeviceRecord";
import { OutcomesConfig } from "./Outcomes";

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
  appId: string;
  deviceType: DeliveryPlatformKind;
  startTimestamp: number;
  accumulatedDuration: number;
  notificationId: string | null; // for direct clicks
  status: SessionStatus;
  lastDeactivatedTimestamp: number | null;
  lastActivatedTimestamp: number;
}

type NewSessionOptions = Partial<Session> & { appId: string };

interface BaseSessionPayload {
  sessionThreshold: number;
  enableSessionDuration: boolean;
  sessionOrigin: SessionOrigin;
  isHttps: boolean;
  isSafari: boolean;
  outcomesConfig: OutcomesConfig;
}

export interface UpsertOrDeactivateSessionPayload extends BaseSessionPayload {
  appId: string;
  onesignalId: string;
  subscriptionId: string;
}

export interface PageVisibilityRequest {
  timestamp: number;
}

export interface PageVisibilityResponse extends PageVisibilityRequest {
  focused: boolean;
}

export const ONESIGNAL_SESSION_KEY = "oneSignalSession";

export function initializeNewSession(options: NewSessionOptions): Session {
  const currentTimestamp = new Date().getTime();
  const sessionKey = options && options.sessionKey || ONESIGNAL_SESSION_KEY;
  const notificationId = (options && options.notificationId) || null;
  const deviceType = DeviceRecord.prototype.getDeliveryPlatform();

  return {
    sessionKey,
    appId: options.appId,
    deviceType,
    startTimestamp: currentTimestamp,
    accumulatedDuration: 0,
    notificationId,
    status: SessionStatus.Active,
    lastDeactivatedTimestamp: null,
    lastActivatedTimestamp: currentTimestamp,
  };
}
