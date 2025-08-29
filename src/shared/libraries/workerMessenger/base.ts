import type { ContextInterface, ContextSWInterface } from '../../context/types';
import type {
  WorkerMessengerCommandValue,
  WorkerMessengerReplyBufferRecord,
} from './types';

declare let self: ServiceWorkerGlobalScope;

export class WorkerMessengerReplyBuffer {
  private replies: {
    [index: string]: WorkerMessengerReplyBufferRecord[] | null;
  };

  constructor() {
    this.replies = {};
  }

  public addListener(
    command: WorkerMessengerCommandValue,
    callback: (param: unknown) => void,
    onceListenerOnly: boolean,
  ) {
    const record: WorkerMessengerReplyBufferRecord = {
      callback,
      onceListenerOnly,
    };

    const replies = this.replies[command.toString()];
    if (replies) replies.push(record);
    else this.replies[command.toString()] = [record];
  }

  public findListenersForMessage(
    command: WorkerMessengerCommandValue,
  ): WorkerMessengerReplyBufferRecord[] {
    return this.replies[command.toString()] || [];
  }

  public deleteListenerRecords(command: WorkerMessengerCommandValue) {
    this.replies[command.toString()] = null;
  }

  public deleteAllListenerRecords() {
    this.replies = {};
  }

  public deleteListenerRecord(
    command: WorkerMessengerCommandValue,
    targetRecord: object,
  ) {
    const listenersForCommand = this.replies[command.toString()];
    if (listenersForCommand == null) return;

    for (
      let listenerRecordIndex = listenersForCommand.length - 1;
      listenerRecordIndex >= 0;
      listenerRecordIndex--
    ) {
      const listenerRecord = listenersForCommand[listenerRecordIndex];
      if (listenerRecord === targetRecord) {
        listenersForCommand.splice(listenerRecordIndex, 1);
      }
    }
  }
}

/**
 * A Promise-based PostMessage helper to ease back-and-forth replies between
 * service workers and window frames.
 */
export class WorkerMessengerBase<
  C extends ContextInterface | ContextSWInterface =
    | ContextInterface
    | ContextSWInterface,
> {
  protected _context?: C;
  protected _replies: WorkerMessengerReplyBuffer;

  constructor(
    context?: C,
    replies: WorkerMessengerReplyBuffer = new WorkerMessengerReplyBuffer(),
  ) {
    this._context = context;
    this._replies = replies;
  }

  /*
    Subscribes a callback to be notified every time a service worker sends a
    message to the window frame with the specific command.
   */
  _on(
    command: WorkerMessengerCommandValue,
    callback: (WorkerMessengerPayload: any) => void,
  ): void {
    this._replies.addListener(command, callback, false);
  }

  /*
  Subscribes a callback to be notified the next time a service worker sends a
  message to the window frame with the specific command.

  The callback is executed once at most.
  */
  _once(
    command: WorkerMessengerCommandValue,
    callback: (WorkerMessengerPayload: any) => void,
  ): void {
    this._replies.addListener(command, callback, true);
  }

  /**
    Unsubscribe a callback from being notified about service worker messages
    with the specified command.
   */
  _off(command?: WorkerMessengerCommandValue): void {
    if (command) {
      this._replies.deleteListenerRecords(command);
    } else {
      this._replies.deleteAllListenerRecords();
    }
  }
}
