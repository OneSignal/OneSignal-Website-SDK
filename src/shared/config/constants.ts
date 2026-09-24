import type {
  NotificationClickActionBehaviorValue,
  NotificationClickMatchBehaviorValue,
} from './types';

export const NotificationClickMatchBehavior = {
  _Exact: 'exact',
  _Origin: 'origin',
} as const satisfies Record<string, NotificationClickMatchBehaviorValue>;

export const NotificationClickActionBehavior = {
  _Navigate: 'navigate',
  _Focus: 'focus',
} as const satisfies Record<string, NotificationClickActionBehaviorValue>;

export const ConfigIntegrationKind = {
  _TypicalSite: 'typical',
  _WordPress: 'wordpress',
  _Custom: 'custom',
} as const;
