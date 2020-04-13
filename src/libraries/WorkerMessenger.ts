import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import SdkEnvironment from '../managers/SdkEnvironment';
import { ServiceWorkerActiveState } from '../helpers/ServiceWorkerHelper';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';

import { Serializable } from '../models/Serializable';
import Environment from '../Environment';
import Log from './Log';
import { ContextSWInterface } from '../models/ContextSW';

/**
 * NOTE: This file contains a mix of code that runs in ServiceWorker and Page contexts
*/

export enum WorkerMessengerCommand {
  WorkerVersion = "GetWorkerVersion",
  Subscribe = "Subscribe",
  SubscribeNew = "SubscribeNew",
  AmpSubscriptionState = "amp-web-push-subscription-state",
  AmpSubscribe = "amp-web-push-subscribe",
  AmpUnsubscribe = "amp-web-push-unsubscribe",
  NotificationDisplayed = 'notification.displayed',
  NotificationClicked = 'notification.clicked',
  NotificationDismissed = 'notification.dismissed',
  RedirectPage = 'command.redirect',
  SessionUpsert = 'os.session.upsert',
  SessionDeactivate = 'os.session.deactivate',
  AreYouVisible = "os.page_focused_request",
  AreYouVisibleResponse = "os.page_focused_response",
}

export interface WorkerMessengerMessage {
  command: WorkerMessengerCommand;
  payload: WorkerMessengerPayload;
}

export interface WorkerMessengerReplyBufferRecord {
  callback: Function;
  onceListenerOnly: boolean;
}

export class WorkerMessengerReplyBuffer {

  private replies: { [index: string]: WorkerMessengerReplyBufferRecord[] | null };

  constructor() {
    this.replies = {};
  }

  public addListener(command: WorkerMessengerCommand, callback: Function, onceListenerOnly: boolean) {
    const record: WorkerMessengerReplyBufferRecord = {callback, onceListenerOnly};

    const replies = this.replies[command.toString()];
    if (replies)
      replies.push(record);
    else
      this.replies[command.toString()] = [record];
  }

  public findListenersForMessage(command: WorkerMessengerCommand): WorkerMessengerReplyBufferRecord[] {
    return this.replies[command.toString()] || [];
  }

  public deleteListenerRecords(command: WorkerMessengerCommand) {
    this.replies[command.toString()] = null;
  }

  public deleteAllListenerRecords() {
    this.replies = {};
  }

  public deleteListenerRecord(command: WorkerMessengerCommand, targetRecord: object) {
    const listenersForCommand = this.replies[command.toString()];
    if (listenersForCommand == null)
      return;

    for (let listenerRecordIndex = listenersForCommand.length - 1; listenerRecordIndex >= 0; listenerRecordIndex--) {
      const listenerRecord = listenersForCommand[listenerRecordIndex];
      if (listenerRecord === targetRecord) {
        listenersForCommand.splice(listenerRecordIndex, 1);
      }
    }
  }
}

export type WorkerMessengerPayload = Serializable | number | string | object | boolean;

 /**
 * A Promise-based PostMessage helper to ease back-and-forth replies between
 * service workers and window frames.
 */
export class WorkerMessenger {

  private context: ContextSWInterface;
  private replies: WorkerMessengerReplyBuffer;

  constructor(context: ContextSWInterface,
              replies: WorkerMessengerReplyBuffer = new WorkerMessengerReplyBuffer()) {
    this.context = context;
    this.replies = replies;
  }

  /**
   * Broadcasts a message from a service worker to all clients, including uncontrolled clients.
   */
  async broadcast(command: WorkerMessengerCommand, payload: WorkerMessengerPayload) {
    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker)
      return;

    const clients = await (<ServiceWorkerGlobalScope><any>self).clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      Log.debug(`[Worker Messenger] [SW -> Page] Broadcasting '${command.toString()}' to window client ${client.url}.`);
      client.postMessage({
        command: command,
        payload: payload
      });
    }
  }

  /*
    For pages:

      Sends a postMessage() to the service worker controlling the page.

      Waits until the service worker is controlling the page before sending the
      message.
   */
  async unicast(command: WorkerMessengerCommand, payload?: WorkerMessengerPayload, windowClient?: Client) {
    const env = SdkEnvironment.getWindowEnv();

    if (env === WindowEnvironmentKind.ServiceWorker) {
      if (!windowClient) {
        throw new InvalidArgumentError('windowClient', InvalidArgumentReason.Empty);
      } else {
        Log.debug(`[Worker Messenger] [SW -> Page] Unicasting '${command.toString()}' to window client ${windowClient.url}.`)
        windowClient.postMessage({
          command: command,
          payload: payload
        } as any);
      }
    } else {
      if (!(await this.isWorkerControllingPage())) {
        Log.debug("[Worker Messenger] The page is not controlled by the service worker yet. Waiting...", (<ServiceWorkerGlobalScope><any>self).registration);
      }
      await this.waitUntilWorkerControlsPage();
      Log.debug(`[Worker Messenger] [Page -> SW] Unicasting '${command.toString()}' to service worker.`)
      this.directPostMessageToSW(command, payload);
    }
  }

  public directPostMessageToSW(command: WorkerMessengerCommand, payload?: WorkerMessengerPayload) {
    Log.debug(`[Worker Messenger] [Page -> SW] Direct command '${command.toString()}' to service worker.`);
    navigator.serviceWorker!.controller!.postMessage({
      command: command,
      payload: payload
    });
  }

  /**
   * Due to https://github.com/w3c/ServiceWorker/issues/1156, listen() must
   * synchronously add self.addEventListener('message') if we are running in the
   * service worker.
   *
   * @param listenIfPageUncontrolled If true, begins listening for service
   * worker messages even if the service worker does not control this page. This
   * parameter is set to true on HTTPS iframes expecting service worker messages
   * that live under an HTTP page.
   */
  public async listen(listenIfPageUncontrolled?: boolean) {
    if (!Environment.supportsServiceWorkers())
      return;

    const env = SdkEnvironment.getWindowEnv();

    if (env === WindowEnvironmentKind.ServiceWorker) {
      self.addEventListener('message', this.onWorkerMessageReceivedFromPage.bind(this));
      Log.debug('[Worker Messenger] Service worker is now listening for messages.');
    }
    else
      await this.listenForPage(listenIfPageUncontrolled);
  }

  /**
   * Listens for messages for the service worker.
   *
   * Waits until the service worker is controlling the page before listening for
   * messages.
   */
  private async listenForPage(listenIfPageUncontrolled?: boolean) {
    if (!listenIfPageUncontrolled) {
      if (!(await this.isWorkerControllingPage())) {
        Log.debug(`(${location.origin}) [Worker Messenger] The page is not controlled by the service worker yet. Waiting...`, (<ServiceWorkerGlobalScope><any>self).registration);
      }
      await this.waitUntilWorkerControlsPage();
      Log.debug(`(${location.origin}) [Worker Messenger] The page is now controlled by the service worker.`);
    }

    navigator.serviceWorker.addEventListener('message', this.onPageMessageReceivedFromServiceWorker.bind(this));
    Log.debug(`(${location.origin}) [Worker Messenger] Page is now listening for messages.`);
  }

  onWorkerMessageReceivedFromPage(event: ServiceWorkerMessageEvent) {
    const data: WorkerMessengerMessage = event.data;

    /* If this message doesn't contain our expected fields, discard the message */
    /* The payload may be null. AMP web push sends commands to our service worker in the format:

       { command: "amp-web-push-subscription-state", payload: null }
       { command: "amp-web-push-unsubscribe", payload: null }
       { command: "amp-web-push-subscribe", payload: null }

    */
    if (!data || !data.command) {
      return;
    }

    const listenerRecords = this.replies.findListenersForMessage(data.command);
    const listenersToRemove = [];
    const listenersToCall = [];

    Log.debug(`[Worker Messenger] Service worker received message:`, event.data);

    for (let listenerRecord of listenerRecords) {
      if (listenerRecord.onceListenerOnly) {
        listenersToRemove.push(listenerRecord);
      }
      listenersToCall.push(listenerRecord);
    }
    for (let i = listenersToRemove.length - 1; i >= 0; i--) {
      const listenerRecord = listenersToRemove[i];
      this.replies.deleteListenerRecord(data.command, listenerRecord);
    }
    for (let listenerRecord of listenersToCall) {
      listenerRecord.callback.apply(null, [data.payload]);
    }
  }

  /*
  Occurs when the page receives a message from the service worker.

  A map of callbacks is checked to see if anyone is listening to the specific
  message topic. If no one is listening to the message, it is discarded;
  otherwise, the listener callback is executed.
  */
  onPageMessageReceivedFromServiceWorker(event: ServiceWorkerMessageEvent) {
    const data: WorkerMessengerMessage = event.data;

    /* If this message doesn't contain our expected fields, discard the message */
    if (!data || !data.command) {
      return;
    }

    const listenerRecords = this.replies.findListenersForMessage(data.command);
    const listenersToRemove = [];
    const listenersToCall = [];

    Log.debug(`[Worker Messenger] Page received message:`, event.data);

    for (let listenerRecord of listenerRecords) {
      if (listenerRecord.onceListenerOnly) {
        listenersToRemove.push(listenerRecord);
      }
      listenersToCall.push(listenerRecord);
    }
    for (let i = listenersToRemove.length - 1; i >= 0; i--) {
      const listenerRecord = listenersToRemove[i];
      this.replies.deleteListenerRecord(data.command, listenerRecord);
    }
    for (let listenerRecord of listenersToCall) {
      listenerRecord.callback.apply(null, [data.payload]);
    }
  }

  /*
    Subscribes a callback to be notified every time a service worker sends a
    message to the window frame with the specific command.
   */
  on(command: WorkerMessengerCommand, callback: (WorkerMessengerPayload: any) => void): void {
    this.replies.addListener(command, callback, false);
  }

  /*
  Subscribes a callback to be notified the next time a service worker sends a
  message to the window frame with the specific command.

  The callback is executed once at most.
  */
  once(command: WorkerMessengerCommand, callback: (WorkerMessengerPayload: any) => void): void {
    this.replies.addListener(command, callback, true);
  }

  /**
    Unsubscribe a callback from being notified about service worker messages
    with the specified command.
   */
  off(command?: WorkerMessengerCommand): void {
    if (command) {
      this.replies.deleteListenerRecords(command);
    } else {
      this.replies.deleteAllListenerRecords();
    }
  }


  /*
    Service worker postMessage() communication relies on the property
    navigator.serviceWorker.controller to be non-null. The controller property
    references the active service worker controlling the page. Without this
    property, there is no service worker to message.

    The controller property is set when a service worker has successfully
    registered, installed, and activated a worker, and when a page isn't loaded
    in a hard refresh mode bypassing the cache.

    It's possible for a service worker to take a second page load to be fully
    activated.
   */
  async isWorkerControllingPage(): Promise<boolean> {
    const env = SdkEnvironment.getWindowEnv();

    if (env === WindowEnvironmentKind.ServiceWorker)
      return !!(<ServiceWorkerGlobalScope><any>self).registration.active;
    else {
      const workerState = await this.context.serviceWorkerManager.getActiveState();
      return workerState === ServiceWorkerActiveState.WorkerA ||
        workerState === ServiceWorkerActiveState.WorkerB;
    }
  }

  /**
   * For pages, waits until one of our workers is activated.
   *
   * For service workers, waits until the registration is active.
   */
  async waitUntilWorkerControlsPage() {
    return new Promise<void>(async resolve => {
      if (await this.isWorkerControllingPage())
        resolve();
      else {
        const env = SdkEnvironment.getWindowEnv();

        if (env === WindowEnvironmentKind.ServiceWorker) {
          self.addEventListener('activate', async (_e: Event) => {
            if (await this.isWorkerControllingPage())
              resolve();
          });
        }
        else {
          navigator.serviceWorker.addEventListener('controllerchange', async (_e: Event) => {
            if (await this.isWorkerControllingPage())
              resolve();
          });
        }
      }
    });
  }
}
