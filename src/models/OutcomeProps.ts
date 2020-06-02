import { OutcomeAttributionType } from './Outcomes';

export default interface OutcomeProps {
  type: OutcomeAttributionType;
  notificationIds: string[];
  isUnique: boolean;
  weight?: number|undefined;
}