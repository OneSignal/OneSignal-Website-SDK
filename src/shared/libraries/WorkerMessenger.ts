import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../errors/InvalidArgumentError';

import type { Serializable } from '../../page/models/Serializable';
import ServiceWorkerUtilHelper from '../../sw/helpers/ServiceWorkerUtilHelper';
import { supportsServiceWorkers } from '../helpers/environment';
import type { ContextSWInterface } from '../models/ContextSW';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import Log from './Log';

declare let self: ServiceWorkerGlobalScope;

/**
 * NOTE: This file contains a mix of code that runs in ServiceWorker and Page contexts
 */
export const WorkerMessengerCommand = {
  WorkerVersion: 'GetWorkerVersion',
  Subscribe: 'Subscribe',
  SubscribeNew: 'SubscribeNew',
  NotificationWillDisplay: 'notification.willDisplay',
  NotificationClicked: 'notification.clicked',
  NotificationDismissed: 'notification.dismissed',
  RedirectPage: 'command.redirect',
  SessionUpsert: 'os.session.upsert',
  SessionDeactivate: 'os.session.deactivate',
  AreYouVisible: 'os.page_focused_request',
  AreYouVisibleResponse: 'os.page_focused_response',
  SetLogging: 'os.set_sw_logging',
} as const;

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

export type WorkerMessengerPayload =
  | Serializable
  | number
  | string
  | object
  | null
  | undefined
  | boolean;

/**
 * A Promise-based PostMessage helper to ease back-and-forth replies between
 * service workers and window frames.
 */
export class WorkerMessenger {
  private context?: ContextSWInterface;
  private replies: WorkerMessengerReplyBuffer;

  constructor(
    context?: ContextSWInterface,
    replies: WorkerMessengerReplyBuffer = new WorkerMessengerReplyBuffer(),
  ) {
    this.context = context;
    this.replies = replies;
  }

  /**
   * Broadcasts a message from a service worker to all clients, including uncontrolled clients.
   */
  async broadcast(
    command: WorkerMessengerCommandValue,
    payload: WorkerMessengerPayload,
  ) {
    if (!IS_SERVICE_WORKER) return;

    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of clients) {
      Log.debug(
        `[Worker Messenger] [SW -> Page] Broadcasting '${command.toString()}' to window client ${
          client.url
        }.`,
      );
      client.postMessage({
        command: command,
        payload: payload,
      });
    }
  }

  /*
    If running on a page context:
      Sends a postMessage() to OneSignal's Serviceworker
    If running in a ServiceWorker context:
      Sends a postMessage() to the supplied windowClient
   */
  async unicast(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
    windowClient?: Client,
  ) {
    if (IS_SERVICE_WORKER) {
      if (!windowClient) {
        throw new InvalidArgumentError(
          'windowClient',
          InvalidArgumentReason.Empty,
        );
      } else {
        Log.debug(
          `[Worker Messenger] [SW -> Page] Unicasting '${command.toString()}' to window client ${
            windowClient.url
          }.`,
        );
        windowClient.postMessage({
          command: command,
          payload: payload,
        } as any);
      }
    } else {
      Log.debug(
        `[Worker Messenger] [Page -> SW] Unicasting '${command.toString()}' to service worker.`,
      );
      this.directPostMessageToSW(command, payload);
    }
  }

  public async directPostMessageToSW(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
  ): Promise<void> {
    Log.debug(
      `[Worker Messenger] [Page -> SW] Direct command '${command.toString()}' to service worker.`,
    );

    const workerRegistration =
      await this.context?.serviceWorkerManager.getOneSignalRegistration();
    if (!workerRegistration) {
      Log.error(
        '`[Worker Messenger] [Page -> SW] Could not get ServiceWorkerRegistration to postMessage!',
      );
      return;
    }

    const availableWorker =
      ServiceWorkerUtilHelper.getAvailableServiceWorker(workerRegistration);
    if (!availableWorker) {
      Log.error(
        '`[Worker Messenger] [Page -> SW] Could not get ServiceWorker to postMessage!',
      );
      return;
    }

    // The postMessage payload will still arrive at the SW even if it isn't active yet.
    availableWorker.postMessage({
      command: command,
      payload: payload,
    });
  }

  /**
   * Due to https://github.com/w3c/ServiceWorker/issues/1156, listen() must
   * synchronously add self.addEventListener('message') if we are running in the
   * service worker.
   */
  public async listen() {
    if (!supportsServiceWorkers()) return;
    if (IS_SERVICE_WORKER) {
      self.addEventListener(
        'message',
        this.onWorkerMessageReceivedFromPage.bind(this),
      );
      Log.debug(
        '[Worker Messenger] Service worker is now listening for messages.',
      );
    } else await this.listenForPage();
  }

  /**
   * Listens for messages for the service worker.
   */
  private async listenForPage() {
    navigator.serviceWorker.addEventListener(
      'message',
      this.onPageMessageReceivedFromServiceWorker.bind(this),
    );
    Log.debug(
      `(${location.origin}) [Worker Messenger] Page is now listening for messages.`,
    );
  }

  onWorkerMessageReceivedFromPage(event: ExtendableMessageEvent) {
    const data: WorkerMessengerMessage = event.data;

    /* If this message doesn't contain our expected fields, discard the message */
    /* The payload may be null.
     */
    if (!data || !data.command) {
      return;
    }

    const listenerRecords = this.replies.findListenersForMessage(data.command);
    const listenersToRemove = [];
    const listenersToCall = [];

    Log.debug(
      `[Worker Messenger] Service worker received message:`,
      event.data,
    );

    for (const listenerRecord of listenerRecords) {
      if (listenerRecord.onceListenerOnly) {
        listenersToRemove.push(listenerRecord);
      }
      listenersToCall.push(listenerRecord);
    }
    for (let i = listenersToRemove.length - 1; i >= 0; i--) {
      const listenerRecord = listenersToRemove[i];
      this.replies.deleteListenerRecord(data.command, listenerRecord);
    }
    for (const listenerRecord of listenersToCall) {
      listenerRecord.callback.apply(null, [data.payload]);
    }
  }

  /*
  Occurs when the page receives a message from the service worker.

  A map of callbacks is checked to see if anyone is listening to the specific
  message topic. If no one is listening to the message, it is discarded;
  otherwise, the listener callback is executed.
  */
  onPageMessageReceivedFromServiceWorker(event: MessageEvent) {
    const data: WorkerMessengerMessage = event.data;

    /* If this message doesn't contain our expected fields, discard the message */
    if (!data || !data.command) {
      return;
    }

    const listenerRecords = this.replies.findListenersForMessage(data.command);
    const listenersToRemove = [];
    const listenersToCall = [];

    Log.debug(`[Worker Messenger] Page received message:`, event.data);

    for (const listenerRecord of listenerRecords) {
      if (listenerRecord.onceListenerOnly) {
        listenersToRemove.push(listenerRecord);
      }
      listenersToCall.push(listenerRecord);
    }
    for (let i = listenersToRemove.length - 1; i >= 0; i--) {
      const listenerRecord = listenersToRemove[i];
      this.replies.deleteListenerRecord(data.command, listenerRecord);
    }
    for (const listenerRecord of listenersToCall) {
      listenerRecord.callback.apply(null, [data.payload]);
    }
  }

  /*
    Subscribes a callback to be notified every time a service worker sends a
    message to the window frame with the specific command.
   */
  on(
    command: WorkerMessengerCommandValue,
    callback: (WorkerMessengerPayload: any) => void,
  ): void {
    this.replies.addListener(command, callback, false);
  }

  /*
  Subscribes a callback to be notified the next time a service worker sends a
  message to the window frame with the specific command.

  The callback is executed once at most.
  */
  once(
    command: WorkerMessengerCommandValue,
    callback: (WorkerMessengerPayload: any) => void,
  ): void {
    this.replies.addListener(command, callback, true);
  }

  /**
    Unsubscribe a callback from being notified about service worker messages
    with the specified command.
   */
  off(command?: WorkerMessengerCommandValue): void {
    if (command) {
      this.replies.deleteListenerRecords(command);
    } else {
      this.replies.deleteAllListenerRecords();
    }
  }
}
