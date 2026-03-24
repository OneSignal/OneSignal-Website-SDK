import type { ContextInterface } from 'src/shared/context/types';
import { supportsServiceWorkers } from 'src/shared/environment/detect';
import { getAvailableServiceWorker } from 'src/sw/helpers/registration';

import Log from '../Log';
import { WorkerMessengerBase } from './base';
import type {
  WorkerMessengerCommandValue,
  WorkerMessengerMessage,
  WorkerMessengerPayload,
} from './types';

export class WorkerMessengerPage extends WorkerMessengerBase<ContextInterface> {
  /**
   * Due to https://github.com/w3c/ServiceWorker/issues/1156, listen() must
   * synchronously add self.addEventListener('message') if we are running in the
   * service worker.
   */
  public _listen() {
    if (!supportsServiceWorkers()) return;
    this._listenForPage();
  }

  /**
   * Listens for messages for the service worker.
   */
  private _listenForPage() {
    navigator.serviceWorker.addEventListener(
      'message',
      this._onPageMessageReceivedFromServiceWorker.bind(this),
    );
    Log._debug(`[WM] Page listening (${location.origin})`);
  }

  /*
  Occurs when the page receives a message from the service worker.

  A map of callbacks is checked to see if anyone is listening to the specific
  message topic. If no one is listening to the message, it is discarded;
  otherwise, the listener callback is executed.
  */
  _onPageMessageReceivedFromServiceWorker(event: MessageEvent) {
    const data: WorkerMessengerMessage = event.data;

    /* If this message doesn't contain our expected fields, discard the message */
    if (!data || !data.command) {
      return;
    }

    const listenerRecords = this._replies._findListenersForMessage(data.command);
    const listenersToRemove = [];
    const listenersToCall = [];

    Log._debug('[WM] Page received:', event.data);

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
   * Sends a postMessage() to OneSignal's Serviceworker
   */
  _unicast(command: WorkerMessengerCommandValue, payload?: WorkerMessengerPayload) {
    Log._debug(`[WM] Page->SW unicast '${command}'`);
    void this._directPostMessageToSW(command, payload);
  }

  public async _directPostMessageToSW(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
  ): Promise<void> {
    Log._debug(`[WM] Page->SW direct '${command}'`);

    const workerRegistration =
      await this._context?._serviceWorkerManager._getOneSignalRegistration();
    if (!workerRegistration) {
      Log._error('[WM] No SW registration for postMessage');
      return;
    }

    const availableWorker = getAvailableServiceWorker(workerRegistration);
    if (!availableWorker) {
      Log._error('[WM] No SW for postMessage');
      return;
    }

    // The postMessage payload will still arrive at the SW even if it isn't active yet.
    availableWorker.postMessage({
      command: command,
      payload: payload,
    });
  }
}
