import { OutcomeAttributionType } from './Outcomes';

export default interface OutcomeProps {
  type: OutcomeAttributionType;
  notificationIds: string[];
  weight?: number|undefined;
}
