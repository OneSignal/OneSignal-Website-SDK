import { EmptyArgumentError } from 'src/shared/errors/common';
import type ContextSW from 'src/shared/models/ContextSW';
import Log from '../Log';
import { WorkerMessengerBase } from './base';
import type {
  WorkerMessengerCommandValue,
  WorkerMessengerMessage,
  WorkerMessengerPayload,
} from './types';

declare let self: ServiceWorkerGlobalScope;

export class WorkerMessengerSW extends WorkerMessengerBase<ContextSW> {
  /**
   * Due to https://github.com/w3c/ServiceWorker/issues/1156, listen() must
   * synchronously add self.addEventListener('message') if we are running in the
   * service worker.
   */
  public async listen() {
    self.addEventListener(
      'message',
      this.onWorkerMessageReceivedFromPage.bind(this),
    );
    Log.debug(
      '[Worker Messenger] Service worker is now listening for messages.',
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

  /**
   * Broadcasts a message from a service worker to all clients, including uncontrolled clients.
   */
  async broadcast(
    command: WorkerMessengerCommandValue,
    payload: WorkerMessengerPayload,
  ) {
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

  /**
   * Sends a postMessage() to the supplied windowClient
   */
  async unicast(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
    windowClient?: Client,
  ) {
    if (!windowClient) {
      throw EmptyArgumentError('windowClient');
    }

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
}
