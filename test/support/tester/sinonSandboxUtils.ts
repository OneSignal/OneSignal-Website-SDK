import { SinonSandbox } from "sinon";

import { createSubscription } from "../../support/tester/utils";
import Database from "../../../src/services/Database";
import InitHelper from "../../../src/helpers/InitHelper";
import {
  MockServiceWorkerRegistration
} from "../../support/mocks/service-workers/models/MockServiceWorkerRegistration";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import PermissionManager from "../../../src/managers/PermissionManager";
import { ServiceWorkerActiveState } from "../../../src/helpers/ServiceWorkerHelper";
import { ServiceWorkerManager } from "../../../src/managers/ServiceWorkerManager";
import { Subscription } from "../../../src/models/Subscription";
import { SubscriptionManager } from "../../../src/managers/SubscriptionManager";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { WorkerMessenger } from "../../../src/libraries/WorkerMessenger";

export async function markUserAsOptedOut(sinonSandbox: SinonSandbox, playerId?: string) {
  const subscription = new Subscription();
  subscription.deviceId = playerId;
  subscription.optedOut = true;
  subscription.subscriptionToken = "some_token";
  subscription.createdAt = Date.now();
  sinonSandbox.stub(Database, "getSubscription").resolves(subscription);
}

export async function markUserAsSubscribed(
  sinonSandbox: SinonSandbox, playerId?: string, expired?: boolean
) {
  const subscription = createSubscription(playerId);
  sinonSandbox.stub(Database, "getSubscription").resolves(subscription);

  sinonSandbox.stub(SubscriptionManager.prototype, "getSubscriptionState")
    .resolves({subscribed: true, isOptedOut: false});
  
  if (expired) {
    sinonSandbox.stub(InitHelper, "processExpiringSubscriptions").resolves(true);
  }
}

export async function markUserAsSubscribedOnHttp(
  sinonSandbox: SinonSandbox, playerId?: string, expired?: boolean
) {
  markUserAsSubscribed(sinonSandbox, playerId, expired);
  sinonSandbox.stub(PermissionManager.prototype, "getOneSignalSubdomainNotificationPermission")
    .resolves(NotificationPermission.Granted);
}

export function stubServiceWorkerInstallation(sinonSandbox: SinonSandbox) {
  const swRegistration = new MockServiceWorkerRegistration();

  sinonSandbox.stub(SubscriptionManager.prototype, "subscribeWithVapidKey")
    .resolves(TestEnvironment.getFakeRawPushSubscription());
  sinonSandbox.stub(ServiceWorkerManager.prototype, "getActiveState")
    .resolves(ServiceWorkerActiveState.WorkerA);
  sinonSandbox.stub(ServiceWorkerManager.prototype, "getRegistration")
    .resolves(swRegistration);
  sinonSandbox.stub(WorkerMessenger.prototype, "unicast").resolves();
}
