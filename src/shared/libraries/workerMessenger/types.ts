import type { Serializable } from 'src/page/models/Serializable';
import type { WorkerMessengerCommand } from './constants';

export type WorkerMessengerPayload =
  | Serializable
  | number
  | string
  | object
  | null
  | undefined
  | boolean;

export type WorkerMessengerCommandValue =
  (typeof WorkerMessengerCommand)[keyof typeof WorkerMessengerCommand];

export interface WorkerMessengerMessage {
  command: WorkerMessengerCommandValue;
  payload: WorkerMessengerPayload;
}

export interface WorkerMessengerReplyBufferRecord {
  callback: (param: unknown) => void;
  onceListenerOnly: boolean;
}
