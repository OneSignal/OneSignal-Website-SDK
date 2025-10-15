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
export class TrackCustomEventOperation extends Operation<ITrackEventOp> {
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
    return this._getProperty('externalId');
  }
  private set externalId(value: string | undefined) {
    this._setProperty('externalId', value);
  }

  /**
   * The timestamp when the event occurred.
   */
  get timestamp(): string {
    return this._getProperty('timestamp');
  }
  private set timestamp(value: string) {
    this._setProperty('timestamp', value);
  }

  /**
   * The custom event instance containing the event name and properties.
   */
  get event(): ICustomEvent {
    return this._getProperty('event');
  }
  set event(value: ICustomEvent) {
    this._setProperty('event', value);
  }

  private get key(): string {
    return `${this._appId}.User.${this._onesignalId}.CustomEvent.${this.event.name}`;
  }

  override get _createComparisonKey(): string {
    return this.key;
  }
  override get _modifyComparisonKey(): string {
    return this.key;
  }

  // TODO: no batching of custom events until finalized
  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }
  override get _canStartExecute(): boolean {
    return !IDManager._isLocalId(this._onesignalId);
  }
  override get _applyToRecordId(): string {
    return this._onesignalId;
  }

  override _translateIds(map: Record<string, string>): void {
    if (map[this._onesignalId]) {
      this._onesignalId = map[this._onesignalId];
    }
  }
}
