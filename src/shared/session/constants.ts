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
  _BeforeUnload: 5,
  _Focus: 7,
  _Blur: 8,
} as const;
