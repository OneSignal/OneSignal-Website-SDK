export const NotificationClickMatchBehavior = {
  _Exact: 'exact',
  _Origin: 'origin',
} as const;

export const NotificationClickActionBehavior = {
  _Navigate: 'navigate',
  _Focus: 'focus',
} as const;

export const ConfigIntegrationKind = {
  _TypicalSite: 'typical',
  _WordPress: 'wordpress',
  _Custom: 'custom',
} as const;

export const SESSION_DEFAULTS = {
  enableOnSession: false,
  sessionThreshold: 30,
  enableSessionDuration: true,
} as const;
