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

// A rejection stays here, so a caller that awaits inside a try with other
// requests does not lose them.
async function listWindowClients(
  command: WorkerMessengerCommandValue,
): Promise<readonly WindowClient[]> {
  try {
    return await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  } catch (e) {
    Log._debug(`[WM] SW->Page '${command}' failed to list the clients:`, e);
    return [];
  }
}

/**
 * Posts a message from the service worker to all window clients, including
 * uncontrolled ones. Standalone so code without a messenger instance can call it.
 */
export async function broadcastToPages(
  command: WorkerMessengerCommandValue,
  payload: WorkerMessengerPayload,
): Promise<void> {
  const clients = await listWindowClients(command);
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

/**
 * Posts a message to one window client: the focused one, then a visible one,
 * then the first one. Use for a message that each tab acts on by itself, because
 * tabs in separate processes do not see each other's localStorage writes in time.
 * If the client throws, for example a tab in the middle of closing, the next
 * client in the order gets the message.
 */
export async function postToOnePage(
  command: WorkerMessengerCommandValue,
  payload: WorkerMessengerPayload,
): Promise<void> {
  const rank = (client: WindowClient) =>
    client.focused ? 0 : client.visibilityState === 'visible' ? 1 : 2;
  const clients = [...(await listWindowClients(command))].sort((a, b) => rank(a) - rank(b));
  for (const client of clients) {
    try {
      client.postMessage({ command, payload });
      Log._debug(`[WM] SW->Page '${command}' ${client.url}`);
      return;
    } catch (e) {
      Log._debug(`[WM] SW->Page '${command}' to ${client.url} failed:`, e);
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
