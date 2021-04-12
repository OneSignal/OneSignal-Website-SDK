import { ContextInterface } from "../../../models/Context";
import { PushDeviceRecord } from "../../../models/PushDeviceRecord";
import { UpsertSessionPayload, DeactivateSessionPayload, SessionOrigin } from "../../../models/Session";
import MainHelper from "../../../helpers/MainHelper";
import Log from "../../../libraries/Log";
import { WorkerMessengerCommand } from "../../../libraries/WorkerMessenger";
import { OneSignalUtils } from "../../../utils/OneSignalUtils";
import { SubscriptionStateKind } from "../../../models/SubscriptionStateKind";
import OneSignalApiShared from "../../../OneSignalApiShared";
import Database from "../../../services/Database";
import { ISessionManager } from "../types";
import { PageFocusChanged, PageFocusManager } from "../../../page/PageFocusManager";

export class SessionManager implements ISessionManager, PageFocusChanged {
  private context: ContextInterface;
  private onSessionSent: boolean = false;
  private pageFocusManager: PageFocusManager;

  constructor(context: ContextInterface, pageFocusManager: PageFocusManager) {
    this.context = context;
    this.pageFocusManager = pageFocusManager;
  }

  async onPageBackgrounded(): Promise<void> {
    await this.notifySWToDeactivateSession(SessionOrigin.VisibilityHidden);
  }

  async onPageForegrounded(): Promise<void> {
    await this.notifySWToUpsertSession(SessionOrigin.VisibilityVisible);
  }

  async onPageUnloaded(): Promise<void> {
    await this.notifySWToDeactivateSession(SessionOrigin.BeforeUnload);
  }

  async notifySWToUpsertSession(sessionOrigin: SessionOrigin): Promise<void> {
    const isHttps = OneSignalUtils.isHttps();
    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId, true)
    ]);

    const payload: UpsertSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: this.context.appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this.context.appConfig.enableSessionDuration,
      sessionOrigin,
      isHttps,
      isSafari: OneSignalUtils.isSafari(),
      outcomesConfig: this.context.appConfig.userConfig.outcomes!,
    };
    if (
      this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
        !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Notify SW to upsert session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
    } else if (this.context.environmentInfo.canTalkToServiceWorker &&
        this.context.environmentInfo.isUsingSubscriptionWorkaround) {
      Log.debug("Notify iframe to notify SW to upsert session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_UPSERT, payload);
    } else { // http w/o our iframe
      // we probably shouldn't even be here
      Log.debug("Notify upsert: do nothing");
    }
  }

  async notifySWToDeactivateSession(sessionOrigin: SessionOrigin): Promise<void> {
    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
    ]);

    const isHttps = OneSignalUtils.isHttps();
    const payload: DeactivateSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord ? deviceRecord.serialize() : undefined,
      sessionThreshold: this.context.appConfig.sessionThreshold!,
      enableSessionDuration: this.context.appConfig.enableSessionDuration!,
      sessionOrigin,
      isHttps,
      isSafari: OneSignalUtils.isSafari(),
      outcomesConfig: this.context.appConfig.userConfig.outcomes!,
    };
    if (
      this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
        !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Notify SW to deactivate session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
    } else if (this.context.environmentInfo.canTalkToServiceWorker &&
        this.context.environmentInfo.isUsingSubscriptionWorkaround) {
      Log.debug("Notify SW to deactivate session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
    } else { // http w/o our iframe
      // we probably shouldn't even be here
      Log.debug("Notify deactivate: do nothing");
    }
  }

  // Upsert session to SW and broadcast global SESSION_STARTED event
  async upsertSession(sessionOrigin: SessionOrigin): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(sessionOrigin);

    if (
      this.context.environmentInfo.isBrowserAndSupportsServiceWorkers ||
      this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      if (!this.context.environmentInfo.canTalkToServiceWorker) {
        this.onSessionSent = sessionOrigin === SessionOrigin.PlayerCreate;
        OneSignal.emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
      }
    } else if (
      !this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
      !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      this.onSessionSent = sessionOrigin === SessionOrigin.PlayerCreate;
      OneSignal.emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
    }

    await sessionPromise;
  }

  // TODO: Why not always send through SW? Logic is duplicated here (with onSessionSent) and is different than the SW's
  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  async sendOnSessionUpdateFromPage(deviceRecord?: PushDeviceRecord): Promise<void> {
    if (this.onSessionSent) {
      return;
    }

    if (!this.context.pageViewManager.isFirstPageView()) {
      return;
    }

    const existingUser = await this.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log.debug("Not sending the on session because user is not registered with OneSignal (no device id)");
      return;
    }

    const deviceId = await MainHelper.getDeviceId();
    if (!deviceRecord) {
      deviceRecord = await MainHelper.createDeviceRecord(this.context.appConfig.appId);
    }

    if (deviceRecord.subscriptionState !== SubscriptionStateKind.Subscribed &&
      OneSignal.config.enableOnSession !== true) {
      return;
    }

    try {
      const newPlayerId = await OneSignalApiShared.updateUserSession(deviceId!, deviceRecord.serialize());
      this.onSessionSent = true;

      // If the returned player id is different, save the new id.
      if (newPlayerId !== deviceId) {
        const subscription = await Database.getSubscription();
        subscription.deviceId = newPlayerId;
        await Database.setSubscription(subscription);
      }
    } catch(e) {
      Log.error(`Failed to update user session. Error "${e.message}" ${e.stack}`);
    }
  }

  setupSessionEventListenersForHttp(): void {
    this.pageFocusManager.addPageFocusChangedListener(this);
  }

  public static setupSessionEventListenersForHttp(): void {
    if (!OneSignal.context || !OneSignal.context.sessionManager) {
      Log.error("OneSignal.context not available for http to setup session event listeners.");
      return;
    }

    OneSignal.context.sessionManager.setupSessionEventListeners();
  }
}
