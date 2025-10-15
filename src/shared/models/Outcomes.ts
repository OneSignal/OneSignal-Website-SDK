export const OutcomeAttributionType = {
  _Direct: 1,
  _Indirect: 2,
  _Unattributed: 3,
  _NotSupported: 4,
} as const;

export type OutcomeAttributionTypeValue =
  (typeof OutcomeAttributionType)[keyof typeof OutcomeAttributionType];

export interface OutcomeAttribution {
  type: OutcomeAttributionTypeValue;
  notificationIds: string[];
}

export interface SentUniqueOutcome {
  outcomeName: string;
  notificationIds: string[];
  sentDuringSession: number | null; // used for unattributed
}
