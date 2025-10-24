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
    super(OPERATION_NAME._CustomEvent, props?.appId, props?.onesignalId);
    if (props?.externalId) this._externalId = props.externalId;
    if (props?.timestamp) this._timestamp = props.timestamp;
    if (props?.event) this._event = props.event;
  }

  /**
   * The external ID for the user, if available.
   */
  get _externalId(): string | undefined {
    return this._getProperty('externalId');
  }
  private set _externalId(value: string | undefined) {
    this._setProperty('externalId', value);
  }

  /**
   * The timestamp when the event occurred.
   */
  get _timestamp(): string {
    return this._getProperty('timestamp');
  }
  private set _timestamp(value: string) {
    this._setProperty('timestamp', value);
  }

  /**
   * The custom event instance containing the event name and properties.
   */
  get _event(): ICustomEvent {
    return this._getProperty('event');
  }
  set _event(value: ICustomEvent) {
    this._setProperty('event', value);
  }

  private get key(): string {
    return `${this._appId}.User.${this._onesignalId}.CustomEvent.${this._event.name}`;
  }

  override get _createComparisonKey(): string {
    return this.key;
  }
  override get _modifyComparisonKey(): string {
    return this.key;
  }

  // TODO: no batching of custom events until finalized
  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._None;
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
