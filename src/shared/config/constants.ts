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
