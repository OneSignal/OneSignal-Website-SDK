export const ONESIGNAL_SESSION_KEY = 'oneSignalSession';

export const SessionStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export const SessionOrigin = {
  UserCreate: 1,
  UserNewSession: 2,
  VisibilityVisible: 3,
  VisibilityHidden: 4,
  BeforeUnload: 5,
  PageRefresh: 6,
  Focus: 7,
  Blur: 8,
} as const;
