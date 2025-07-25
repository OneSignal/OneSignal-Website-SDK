import type { OutcomeAttributionTypeValue } from './Outcomes';

export interface OutcomeProps {
  type: OutcomeAttributionTypeValue;
  notificationIds: string[];
  weight?: number | undefined;
}
