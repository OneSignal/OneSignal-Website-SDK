import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../constants';
import type { ICustomEvent } from '../types/customEvents';
import {
  GroupComparisonType,
  Operation,
  type GroupComparisonValue,
} from './Operation';

type OperationProps = {
  appId: string;
  onesignalId: string;
  externalId?: string;
  /**
   * Time should be an ISO 8601 string
   */
  timestamp: string;
  event: ICustomEvent;
};

type ITrackEventOp = Pick<OperationProps, 'externalId' | 'timestamp' | 'event'>;

/**
 * An Operation to track a custom event for a specific user.
 */
export class TrackEventOperation extends Operation<ITrackEventOp> {
  constructor(props?: OperationProps);
  constructor(props: OperationProps) {
    super(OPERATION_NAME.CUSTOM_EVENT, props?.appId, props?.onesignalId);
    if (props?.externalId) this.externalId = props.externalId;
    if (props?.timestamp) this.timestamp = props.timestamp;
    if (props?.event) this.event = props.event;
  }

  /**
   * The external ID for the user, if available.
   */
  get externalId(): string | undefined {
    return this.getProperty('externalId');
  }
  private set externalId(value: string | undefined) {
    this.setProperty('externalId', value);
  }

  /**
   * The timestamp when the event occurred.
   */
  get timestamp(): string {
    return this.getProperty('timestamp');
  }
  private set timestamp(value: string) {
    this.setProperty('timestamp', value);
  }

  /**
   * The custom event instance containing the event name and properties.
   */
  get event(): ICustomEvent {
    return this.getProperty('event');
  }
  set event(value: ICustomEvent) {
    this.setProperty('event', value);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.CustomEvent`;
  }
  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.CustomEvent.${this.name}`;
  }

  // TODO: no batching of custom events until finalized
  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }
  override get canStartExecute(): boolean {
    return !IDManager.isLocalId(this.onesignalId);
  }
  override get applyToRecordId(): string {
    return this.onesignalId;
  }

  override translateIds(map: Record<string, string>): void {
    if (map[this.onesignalId]) {
      this.onesignalId = map[this.onesignalId];
    }
  }
}
