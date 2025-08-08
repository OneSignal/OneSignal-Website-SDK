export const NotificationClickMatchBehavior = {
  Exact: 'exact',
  Origin: 'origin',
} as const;

export const NotificationClickActionBehavior = {
  Navigate: 'navigate',
  Focus: 'focus',
} as const;

export const ConfigIntegrationKind = {
  TypicalSite: 'typical',
  WordPress: 'wordpress',
  Custom: 'custom',
} as const;
