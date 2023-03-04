import Environment from "../Environment";
import { ConfigHelper } from "../helpers/ConfigHelper";
import SWLog from "../libraries/SWLog";
import { WorkerMessenger, WorkerMessengerCommand } from "../libraries/WorkerMessenger";
import ContextSW from "../models/ContextSW";
import { PageVisibilityResponse } from "../models/Session";
import { SubscriptionStrategyKind } from "../models/SubscriptionStrategyKind";
import { UnsubscriptionStrategy } from "../models/UnsubscriptionStrategy";
import OneSignalApiSW from "../OneSignalApiSW";
import Database from "../services/Database";
import { OSServiceWorkerFields } from "./types";
import { ServiceWorker as OSServiceWorker } from "./ServiceWorker";

declare var self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

// Behaviorally identical extraction from setupMessageListeners for test surface area.
export type WorkerMessengerCommandHandler = (_: any) => Promise<void> | void;
export type WorkerMessengerCommandHandlers =
  Partial<Record<WorkerMessengerCommand, WorkerMessengerCommandHandler>>;

export function buildWorkerMessagingCommandHandlers(
  workerMessenger: WorkerMessenger
): WorkerMessengerCommandHandlers {
  return {
    [WorkerMessengerCommand.WorkerVersion]: function(_: any) {
      SWLog.debug('[Service Worker] Received worker version message.');
      workerMessenger.broadcast(WorkerMessengerCommand.WorkerVersion, Environment.version());
    },
    [WorkerMessengerCommand.Subscribe]: async (appConfigBundle: any) => {
      const appConfig = appConfigBundle;
      SWLog.debug('[Service Worker] Received subscribe message.');
      const context = new ContextSW(appConfig);
      const rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.ResubscribeExisting);
      const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
      workerMessenger.broadcast(WorkerMessengerCommand.Subscribe, subscription.serialize());
    },
    [WorkerMessengerCommand.SubscribeNew]: async (appConfigBundle: any) => {
      const appConfig = appConfigBundle;
      SWLog.debug('[Service Worker] Received subscribe new message.');
      const context = new ContextSW(appConfig);
      const rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew);
      const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
      workerMessenger.broadcast(WorkerMessengerCommand.SubscribeNew, subscription.serialize());
    },
    [WorkerMessengerCommand.AmpSubscriptionState]: async (_appConfigBundle: any) => {
      SWLog.debug('[Service Worker] Received AMP subscription state message.');
      const pushSubscription = await self.registration.pushManager.getSubscription();
      if (!pushSubscription) {
        await workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscriptionState, false);
      } else {
        const permission = await self.registration.pushManager.permissionState(pushSubscription.options);
        const { optedOut } = await Database.getSubscription();
        const isSubscribed = !!pushSubscription && permission === "granted" && optedOut !== true;
        await workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscriptionState, isSubscribed);
      }
    },
    [WorkerMessengerCommand.AmpSubscribe]: async () => {
      SWLog.debug('[Service Worker] Received AMP subscribe message.');
      const appId = await OSServiceWorker.getAppId();
      const appConfig = await ConfigHelper.getAppConfig({ appId }, OneSignalApiSW.downloadServerAppConfig);
      const context = new ContextSW(appConfig);
      const rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.ResubscribeExisting);
      const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
      await Database.put('Ids', { type: 'appId', id: appId });
      workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscribe, subscription.deviceId);
    },
    [WorkerMessengerCommand.AmpUnsubscribe]: async () => {
      SWLog.debug('[Service Worker] Received AMP unsubscribe message.');
      const appId = await OSServiceWorker.getAppId();
      const appConfig = await ConfigHelper.getAppConfig({ appId }, OneSignalApiSW.downloadServerAppConfig);
      const context = new ContextSW(appConfig);
      await context.subscriptionManager.unsubscribe(UnsubscriptionStrategy.MarkUnsubscribed);
      workerMessenger.broadcast(WorkerMessengerCommand.AmpUnsubscribe, null);
    },
    [WorkerMessengerCommand.AreYouVisibleResponse]: async (payload: PageVisibilityResponse) => {
      SWLog.debug('[Service Worker] Received response for AreYouVisible', payload);
      if (!self.clientsStatus) { return; }

      const timestamp = payload.timestamp;
      if (self.clientsStatus.timestamp !== timestamp) { return; }

      self.clientsStatus.receivedResponsesCount++;
      if (payload.focused) {
        self.clientsStatus.hasAnyActiveSessions = true;
      }
    },
    [WorkerMessengerCommand.SetLogging]: async (payload: {shouldLog: boolean}) => {
      const message = !!payload.shouldLog
        ? "enabled"
        : "disabled";

      // Ensure this message will be logged:
      SWLog.resetConsole(SWLog.consoles.null);
      SWLog.debug(`[Service Worker] Received SetLogging message. Logging ${message}.`, payload);

      // Now set it how it should be, newly:
      const derivedConsole = (!!payload.shouldLog)
        ? SWLog.consoles.env
        : SWLog.consoles.null;
      SWLog.resetConsole(derivedConsole);
    },
  }
}

export function applyWorkerMessagingCommandHandlers(
  workerMessenger: WorkerMessenger,
  workerMessengerCommandHandlers: WorkerMessengerCommandHandlers,
): void {
  Object.keys(workerMessengerCommandHandlers).forEach((message: string) => {
    workerMessenger.on(
      message as WorkerMessengerCommand,
      workerMessengerCommandHandlers[message as WorkerMessengerCommand] as WorkerMessengerCommandHandler,
    );
  });
}


