import type { ContextInterface } from 'src/shared/context/types';
import { supportsServiceWorkers } from 'src/shared/environment/detect';
import log from 'src/shared/helpers/log';
import { MessageTypePage } from 'src/shared/helpers/log/constants';
import { getAvailableServiceWorker } from 'src/sw/helpers/registration';
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
  public async listen() {
    if (!supportsServiceWorkers()) return;
    await this.listenForPage();
  }

  /**
   * Listens for messages for the service worker.
   */
  private async listenForPage() {
    navigator.serviceWorker.addEventListener(
      'message',
      this.onPageMessageReceivedFromServiceWorker.bind(this),
    );
    log(MessageTypePage.WorkerMessengerPageListening, {
      origin: location.origin,
    });
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

    log(MessageTypePage.WorkerMessengerPageReceived, {
      eventData: event.data,
    });

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
   * Sends a postMessage() to OneSignal's Serviceworker
   */
  async unicast(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
  ) {
    log(MessageTypePage.WorkerMessengerPageUnicast, {
      command: command.toString(),
    });
    this.directPostMessageToSW(command, payload);
  }

  public async directPostMessageToSW(
    command: WorkerMessengerCommandValue,
    payload?: WorkerMessengerPayload,
  ): Promise<void> {
    log(MessageTypePage.WorkerMessengerPageDirect, {
      command: command.toString(),
    });

    const workerRegistration =
      await this.context?.serviceWorkerManager.getOneSignalRegistration();
    if (!workerRegistration) {
      log(
        MessageTypePage.WorkerMessengerPageRegistrationError,
      );
      return;
    }

    const availableWorker = getAvailableServiceWorker(workerRegistration);
    if (!availableWorker) {
      log(
        MessageTypePage.WorkerMessengerPageServiceWorkerError,
      );
      return;
    }

    // The postMessage payload will still arrive at the SW even if it isn't active yet.
    availableWorker.postMessage({
      command: command,
      payload: payload,
    });
  }
}
