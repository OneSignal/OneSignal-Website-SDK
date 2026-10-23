import { EmptyArgumentError } from 'src/shared/errors/common';
import { redactJwt } from 'src/shared/helpers/general';
import type ContextSW from 'src/shared/models/ContextSW';

import Log from '../Log';
import { WorkerMessengerBase } from './base';
import type {
  WorkerMessengerCommandValue,
  WorkerMessengerMessage,
  WorkerMessengerPayload,
} from './types';

declare let self: ServiceWorkerGlobalScope;

/**
 * Posts a message from the service worker to all window clients, including
 * uncontrolled ones. Standalone so code without a messenger instance can call it.
 */
export async function broadcastToPages(
  command: WorkerMessengerCommandValue,
  payload: WorkerMessengerPayload,
): Promise<void> {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of clients) {
    Log._debug(`[WM] SW->Page broadcast '${command}' ${client.url}`);
    // A client in the middle of closing throws; the other tabs still get the message.
    try {
      client.postMessage({
        command: command,
        payload: payload,
      });
    } catch (e) {
      Log._debug(`[WM] SW->Page broadcast to ${client.url} failed:`, e);
    }
  }
}

export class WorkerMessengerSW extends WorkerMessengerBase<ContextSW> {
  /**
   * Due to https://github.com/w3c/ServiceWorker/issues/1156, listen() must
   * synchronously add self.addEventListener('message') if we are running in the
   * service worker.
   */
  public _listen() {
    self.addEventListener('message', this._onWorkerMessageReceivedFromPage.bind(this));
    Log._debug('[WM] SW listening');
  }

  _onWorkerMessageReceivedFromPage(event: ExtendableMessageEvent) {
    const data: WorkerMessengerMessage = event.data;

    /* If this message doesn't contain our expected fields, discard the message */
    /* The payload may be null.
     */
    if (!data || !data.command) {
      return;
    }

    const listenerRecords = this._replies._findListenersForMessage(data.command);
    const listenersToRemove = [];
    const listenersToCall = [];

    Log._debug('[WM] SW received:', { ...data, payload: redactJwt(data.payload) });

    for (const listenerRecord of listenerRecords) {
      if (listenerRecord.onceListenerOnly) {
        listenersToRemove.push(listenerRecord);
      }
      listenersToCall.push(listenerRecord);
    }
    for (let i = listenersToRemove.length - 1; i >= 0; i--) {
      const listenerRecord = listenersToRemove[i];
      this._replies._deleteListenerRecord(data.command, listenerRecord);
    }
    for (const listenerRecord of listenersToCall) {
      listenerRecord.callback.apply(null, [data.payload]);
    }
  }

  /**
   * Broadcasts a message from a service worker to all clients, including uncontrolled clients.
   */
  async _broadcast(command: WorkerMessengerCommandValue, payload: WorkerMessengerPayload) {
    await broadcastToPages(command, payload);
  }

  /**
   * Sends a postMessage() to the supplied windowClient
   */
  _unicast(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
    windowClient?: Client,
  ) {
    if (!windowClient) {
      throw EmptyArgumentError('windowClient');
    }

    Log._debug(`[WM] SW->Page unicast '${command}' ${windowClient.url}`);
    windowClient.postMessage({
      command: command,
      payload: payload,
    } as any);
  }
}
