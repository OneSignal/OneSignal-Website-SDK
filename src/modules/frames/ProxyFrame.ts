import Event from '../../Event';
import InitHelper from '../../helpers/InitHelper';
import TestHelper from '../../helpers/TestHelper';
import SdkEnvironment from '../../managers/SdkEnvironment';
import { MessengerMessageEvent } from '../../models/MessengerMessageEvent';
import Postmam from '../../Postmam';
import Database, { OneSignalDbTable } from '../../services/Database';
import { unsubscribeFromPush } from '../../utils';
import RemoteFrame from './RemoteFrame';
import Context from '../../models/Context';
import Log from '../../libraries/Log';
import {
  UpsertSessionPayload, DeactivateSessionPayload, PageVisibilityResponse
} from "../../models/Session";
import { WorkerMessengerCommand } from "../../libraries/WorkerMessenger";

/**
 * The actual OneSignal proxy frame contents / implementation, that is loaded
 * into the iFrame URL as subdomain.onesignal.com/webPushIFrame or
 * subdomain.os.tc/webPushIFrame. *
 */
export default class ProxyFrame extends RemoteFrame {
  public messenger: Postmam;

  /**
   * Loads the messenger on the iFrame to communicate with the host page and
   * assigns init options to an iFrame-only initialization of OneSignal.
   *
   * Our main host page will wait for all iFrame scripts to complete since the
   * host page uses the iFrame onload event to begin sending handshake messages
   * to the iFrame.
   *
   * There is no load timeout here; the iFrame initializes it scripts and waits
   * forever for the first handshake message.
   */
  initialize(): Promise<void> {
    const promise = super.initialize();
    Event.trigger('httpInitialize');
    return promise;
  }

  establishCrossOriginMessaging() {
    if (this.messenger) {
      this.messenger.destroy();
    }
    this.messenger = new Postmam(window, this.options.origin, this.options.origin);
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.CONNECTED, this.onMessengerConnect.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.IFRAME_POPUP_INITIALIZE, this.onProxyFrameInitializing.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION,
      this.onRemoteNotificationPermission.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, this.onRemoteDatabaseGet.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET_ALL, this.onRemoteDatabaseGetAll.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, this.onRemoteDatabasePut.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, this.onRemoteDatabaseRemove.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, this.onUnsubscribeFromPush.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.MARK_PROMPT_DISMISSED, this.onMarkPromptDismissed.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.IS_SUBSCRIBED, this.onIsSubscribed.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_PROXY_FRAME, this.onUnsubscribeProxyFrame.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.SERVICE_WORKER_STATE, this.onServiceWorkerState.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.GET_WORKER_VERSION, this.onWorkerVersion.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.SUBSCRIPTION_EXPIRATION_STATE,
      this.onSubscriptionExpirationState.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.PROCESS_EXPIRING_SUBSCRIPTIONS,
      this.onProcessExpiringSubscriptions.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.GET_SUBSCRIPTION_STATE,
      this.onGetSubscriptionState.bind(this));
    this.messenger.on(OneSignal.POSTMAM_COMMANDS.SESSION_UPSERT, this.onSessionUpsert.bind(this));
    this.messenger.on(
      OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, this.onSessionDeactivate.bind(this));
    this.messenger.on(
      OneSignal.POSTMAM_COMMANDS.ARE_YOU_VISIBLE_REQUEST, this.onAreYouVisibleRequest.bind(this));
    this.messenger.on(
      OneSignal.POSTMAM_COMMANDS.ARE_YOU_VISIBLE_RESPONSE, this.onAreYouVisibleResponse.bind(this));
    this.messenger.listen();
  }

  retriggerRemoteEvent(eventName: string, eventData: any) {
    this.messenger.message(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, {eventName, eventData});
  }

  async onMessengerConnect(_: MessengerMessageEvent) {
    Log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) Successfully established cross-origin communication.`);
    this.finishInitialization();
    return false;
  }

  async onProxyFrameInitializing(message: MessengerMessageEvent) {
    Log.info(`(${SdkEnvironment.getWindowEnv().toString()}) The iFrame has just received initOptions from the host page!`);

    OneSignal.config = {
      ...message.data.hostInitOptions,
      ...OneSignal.config,
      ...{
      pageUrl: message.data.pageUrl,
      pageTitle: message.data.pageTitle
      }
    };

    InitHelper.installNativePromptPermissionChangedHook();

    // 3/30/16: For HTTP sites, put the host page URL as default URL if one doesn't exist already
    const defaultUrl = await Database.get('Options', 'defaultUrl');
    if (!defaultUrl) {
      await Database.put('Options', {key: 'defaultUrl', value: new URL(OneSignal.config.pageUrl).origin});
    }

    /**
     * When a user is on http://example.com and receives a notification, we want to open a new window only if the
     * notification's URL is different from http://example.com. The service worker, which only controls
     * subdomain.onesignal.com, doesn't know that the host URL is http://example.com. Although defaultUrl above
     * sets the HTTP's origin, this can be modified if users call setDefaultTitle(). lastKnownHostUrl therefore
     * stores the last visited full page URL.
     */
    await Database.put('Options', { key: 'lastKnownHostUrl', value: OneSignal.config.pageUrl });
    await InitHelper.initSaveState(OneSignal.config.pageTitle);
    await InitHelper.storeInitialValues();
    await InitHelper.saveInitOptions();

    if (navigator.serviceWorker && window.location.protocol === 'https:') {
      try {
        const context: Context = OneSignal.context;
        context.serviceWorkerManager.establishServiceWorkerChannel();
      } catch (e) {
        Log.error(`Error interacting with Service Worker inside an HTTP-hosted iFrame:`, e);
      }
    }

    message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
  }

  async onRemoteNotificationPermission(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const permission = await context.permissionManager.getReportedNotificationPermission(context.appConfig.safariWebId);
    message.reply(permission);
    return false;
  }

  async onRemoteDatabaseGet(message: MessengerMessageEvent) {
    // retrievals is an array of key-value pairs e.g. [{table: 'Ids', keys:
    // 'someId'}, {table: 'Ids', keys: 'someId'}]
    const retrievals: Array<{table: OneSignalDbTable, key: string}> = message.data;
    const retrievalOpPromises = [];
    for (let retrieval of retrievals) {
      const {table, key} = retrieval;
      retrievalOpPromises.push(Database.get(table, key));
    }
    const results = await Promise.all(retrievalOpPromises);
    message.reply(results);
    return false;
  }

  async onRemoteDatabaseGetAll(message: MessengerMessageEvent) {
    const table: OneSignalDbTable = message.data.table;
    console.log("onRemoteDatabaseGetAll", table);
    const results = await Database.getAll(table);
    
    message.reply(results);
    return false;
  }

  async onRemoteDatabasePut(message: MessengerMessageEvent) {
    // insertions is an array of key-value pairs e.g. [table: {'Options': keypath: {key: persistNotification, value: '...'}}, {table: 'Ids', keypath: {type: 'userId', id: '...'}]
    // It's formatted that way because our IndexedDB database is formatted that way
    const insertions: Array<{table: OneSignalDbTable, keypath: any}> = message.data;
    let insertionOpPromises = [];
    for (let insertion of insertions) {
      let {table, keypath} = insertion;
      insertionOpPromises.push(Database.put(table, keypath));
    }
    await Promise.all(insertionOpPromises);
    message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    return false;
  }

  async onRemoteDatabaseRemove(message: MessengerMessageEvent) {
    // removals is an array of key-value pairs e.g. [table: {'Options': keypath: {key: persistNotification, value: '...'}}, {table: 'Ids', keypath: {type: 'userId', id: '...'}]
    // It's formatted that way because our IndexedDB database is formatted that way
    const removals: Array<{table: OneSignalDbTable, keypath: any}> = message.data;
    let removalOpPromises = [];
    for (let removal of removals) {
      let {table, keypath} = removal;
      removalOpPromises.push(Database.remove(table, keypath));
    }
    await Promise.all(removalOpPromises);
    message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    return false;
  }

  async onUnsubscribeFromPush(message: MessengerMessageEvent) {
    Log.debug('(Reposted from iFrame -> Host) User unsubscribed but permission granted. Re-prompting the user for push.');
    try {
      await unsubscribeFromPush();
      message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    } catch (e) {
      Log.debug('Failed to unsubscribe from push remotely:', e);
    }
  }

  async onMarkPromptDismissed(message: MessengerMessageEvent) {
    Log.debug('(Reposted from iFrame -> Host) Marking prompt as dismissed.');
    await TestHelper.markHttpsNativePromptDismissed();
    message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    return false;
  }

  async onIsSubscribed(message: MessengerMessageEvent) {
    const isSubscribed = await OneSignal.isPushNotificationsEnabled();
    message.reply(isSubscribed);
    return false;
  }

  async onUnsubscribeProxyFrame(message: MessengerMessageEvent) {
    const isSubscribed = await OneSignal.isPushNotificationsEnabled();
    if (isSubscribed) {
      /*
        Set a flag to prevent a notification from being sent from OneSignal's
        side. The subscription stored locally on the browser is live and
        messageable, but we can't query it or unsubscribe from it since we're on
        an insecure origin. The most we can do is have our SDK delete the stored
        information to pretend we're not subscribed on both the client SDK side
        and the server side.
      */
      // Set a flag remotely to prevent notifications from being sent
      await OneSignal.setSubscription(false);
      // Orphan the subscription by removing data stored about it
      // This causes our SDK to think we're no longer subscribed on this frame
      await OneSignal.database.rebuild();
    }
    message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    return false;
  }

  async onServiceWorkerState(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const result = await context.serviceWorkerManager.getActiveState();
    message.reply(result);
    return false;
  }

  async onWorkerVersion(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const result = await context.serviceWorkerManager.getWorkerVersion();
    message.reply(result);
    return false;
  }

  async onSubscriptionExpirationState(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const result = await context.subscriptionManager.isSubscriptionExpiring();
    message.reply(result);
    return false;
  }

  async onProcessExpiringSubscriptions(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const result = await InitHelper.processExpiringSubscriptions();
    message.reply(OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE);
    return false;
  }

  async onGetSubscriptionState(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const result = await context.subscriptionManager.getSubscriptionState();
    message.reply(result);
    return false;
  }

  async onSessionUpsert(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const payload = message.data as UpsertSessionPayload;
    context.workerMessenger.directPostMessageToSW(WorkerMessengerCommand.SessionUpsert, payload);
    message.reply(true);
  }

  async onSessionDeactivate(message: MessengerMessageEvent) {
    const context: Context = OneSignal.context;
    const payload = message.data as DeactivateSessionPayload;
    context.workerMessenger.directPostMessageToSW(
      WorkerMessengerCommand.SessionDeactivate, payload);
    message.reply(true);
  }

  async onAreYouVisibleRequest(message: MessengerMessageEvent) {
    Log.debug("onAreYouVisibleRequest iframe", message);
  }

  async onAreYouVisibleResponse(message: MessengerMessageEvent) {
    Log.debug("onAreYouVisibleResponse iframe", message);
    const context: Context = OneSignal.context;
    const payload = message.data as PageVisibilityResponse;
    context.workerMessenger.directPostMessageToSW(
      WorkerMessengerCommand.AreYouVisibleResponse, payload);
    message.reply(true);
  }
}
