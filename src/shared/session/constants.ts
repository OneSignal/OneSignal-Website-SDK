export const ONESIGNAL_SESSION_KEY = 'oneSignalSession';

export const SessionStatus = {
  _Active: 'active',
  _Inactive: 'inactive',
} as const;

export const SessionOrigin = {
  _UserCreate: 1,
  _UserNewSession: 2,
  _VisibilityVisible: 3,
  _VisibilityHidden: 4,
  _PageHide: 5,
  _Focus: 7,
  _Blur: 8,
  _JwtUpdated: 9,
  _Heartbeat: 10,
} as const;

// Hardcoded until the interval is remotely configured. Matches the mobile SDKs.
export const HEARTBEAT_INTERVAL_SECONDS = 30 * 60;
export const HEARTBEAT_SLACK_SECONDS = 60;

/** How long after a click its page may start the session it attributes. */
export const CLICK_ATTRIBUTION_WINDOW_SECONDS = 60;
