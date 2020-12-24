import test, { ExecutionContext } from 'ava';
import '../../support/polyfills/polyfills';
import sinon, { SinonSandbox } from 'sinon';

import { ServiceWorker } from '../../../src/service-worker/ServiceWorker';
import { setBrowser } from '../../support/tester/browser';
import { BrowserUserAgent, TestEnvironment } from '../../support/sdk/TestEnvironment';

import Database from '../../../src/services/Database';
import { ConfigIntegrationKind } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import OneSignalApiSW from '../../../src/OneSignalApiSW';
import { setupBrowserWithPushAPIWithVAPIDEnv } from "../../support/tester/utils";
import { MockPushManager } from "../../support/mocks/service-workers/models/MockPushManager";
import {
  MockPushSubscriptionChangeEvent
} from "../../support/mocks/service-workers/models/MockPushSubscriptionChangeEvent";

declare var self: ServiceWorkerGlobalScope;
const appId = Random.getRandomUuid();
const existingDeviceId = Random.getRandomUuid();
let oldSubscription: PushSubscription;
let newSubscription: PushSubscription;

let sinonSandbox: SinonSandbox;

test.beforeEach(async() => {
  sinonSandbox = sinon.sandbox.create();
  sinonSandbox.stub(OneSignalApiSW, 'downloadServerAppConfig')
    .resolves(TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom));
  sinonSandbox.stub(OneSignalApiSW, 'updatePlayer').resolves();

  oldSubscription = await new MockPushManager().subscribe({
    userVisibleOnly: true,
    applicationServerKey: Random.getRandomUint8Array(65).buffer
  });

  newSubscription = await new MockPushManager().subscribe({
    userVisibleOnly: true,
    applicationServerKey: Random.getRandomUint8Array(65).buffer
  });

  await TestEnvironment.initializeForServiceWorker({
    url: new URL(`https://site.com/service-worker.js?appId=${appId}`)
  });

  setBrowser(BrowserUserAgent.ChromeMacSupported);

  // Service worker does not have "window"
  sinonSandbox.stub((<any>global), "window").value(undefined);

  setupBrowserWithPushAPIWithVAPIDEnv(sinonSandbox);

});

test.afterEach(function (_t: ExecutionContext) {
  sinonSandbox.restore();
});

test(`called with an old and new subscription successfully updates the subscription`, async t => {
  /*
    For this test, pretend the user revoked permissions, pushsubscriptionchange's event provides
    an oldSubscription but not a new subscription, and the service worker tries to resubscribe
    anyways.

    It's going to fail due to the blocked permission, so let's simulate that here.
   */
  sinonSandbox
    .stub(SubscriptionManager.prototype, 'subscribeFcmFromWorker')
    .throws('some-error');

  await setInitialDatabaseState(existingDeviceId, oldSubscription.endpoint);

  //before subscription change
  let subscription = await Database.getSubscription();
  t.deepEqual(subscription.deviceId, existingDeviceId);
  t.deepEqual(subscription.subscriptionToken, oldSubscription.endpoint);
  
  const event = new MockPushSubscriptionChangeEvent();
  event.oldSubscription = oldSubscription;
  event.newSubscription = newSubscription;

  // navigator.permissions is undefined in Firefox service worker context, lets simulate that here
  sinonSandbox.stub(navigator, 'permissions').value(undefined);
  
  await runPushSubscriptionChange(event);

  // After pushsubscriptionchange
  subscription = await Database.getSubscription();
  // The device record ID should stay the same
  t.deepEqual(subscription.deviceId, existingDeviceId);
  // The subscription endpoint should be the new endpoint
  t.deepEqual(subscription.subscriptionToken, newSubscription.endpoint);
});

test(`without an existing device ID, lookup existing device ID, updates the looked-up record`, async t => {
  const idReturnedByLookupCall = Random.getRandomUuid();
  sinonSandbox.stub(OneSignalApiSW, 'getUserIdFromSubscriptionIdentifier').resolves(idReturnedByLookupCall);

  // Before pushsubscriptionchange
  let subscription = await Database.getSubscription();
  // There should be no existing device ID, we'll look this up by push endpoint in the test
  t.deepEqual(subscription.deviceId, null);
  // Don't check existence of old endpoint, it isn't used, pushsubscriptionchange provides the old endpoint

  const event = new MockPushSubscriptionChangeEvent();
  event.oldSubscription = oldSubscription;
  event.newSubscription = newSubscription;
  await runPushSubscriptionChange(event);

  // After pushsubscriptionchange
  subscription = await Database.getSubscription();
  // We should now have a device ID
  t.deepEqual(subscription.deviceId, idReturnedByLookupCall);
  // Our push endpoint should be the new updated one
  t.deepEqual(subscription.subscriptionToken, newSubscription.endpoint);
});

test(`called with an old and without a new subscription, custom resubscription succeeds and updates record endpoint`,
  async t => {
  const newSubscriptionByReregistration = newSubscription;

  sinonSandbox.stub(MockPushManager.prototype, 'subscribe')
    .callsFake(async (_options?: PushSubscriptionOptionsInit) => {
      const subscription = await self.registration.pushManager.getSubscription();
      if (!subscription) {
        return newSubscriptionByReregistration;
      } else {
        return oldSubscription;
      }
    });

  await setInitialDatabaseState(existingDeviceId, oldSubscription.endpoint);

  // Before pushsubscriptionchange
  let subscription = await Database.getSubscription();
  t.deepEqual(subscription.deviceId, existingDeviceId);
  t.deepEqual(subscription.subscriptionToken, oldSubscription.endpoint);

  const event = new MockPushSubscriptionChangeEvent();
  event.oldSubscription = oldSubscription;
  event.newSubscription = newSubscriptionByReregistration;
  await runPushSubscriptionChange(event);

  // After pushsubscriptionchange
  subscription = await Database.getSubscription();
  t.deepEqual(subscription.deviceId, existingDeviceId);
  t.deepEqual(subscription.subscriptionToken, newSubscriptionByReregistration.endpoint);
});

test(
  `called with an existing device ID, with old and without new subscription, custom resubscription fails ` +
  `and updates existing device record to clear subscription`,
  async t => {
    sinonSandbox
      .stub(SubscriptionManager.prototype, 'subscribeFcmFromWorker')
      .throws('some-error');

    await setInitialDatabaseState(existingDeviceId, oldSubscription.endpoint);

    // Before pushsubscriptionchange
    let subscription = await Database.getSubscription();
    t.deepEqual(subscription.deviceId, existingDeviceId);
    t.deepEqual(subscription.subscriptionToken, oldSubscription.endpoint);

    const event = new MockPushSubscriptionChangeEvent();
    event.oldSubscription = oldSubscription;
    await runPushSubscriptionChange(event);

    // After pushsubscriptionchange
    subscription = await Database.getSubscription();
    t.deepEqual(subscription.deviceId, existingDeviceId);
    t.deepEqual(subscription.subscriptionToken, null);
});

test(`called without an existing device ID, without old and new subscription, custom resubscription fails ` +
`and local data is cleared`, async t => {
  sinonSandbox
    .stub(SubscriptionManager.prototype, 'subscribeFcmFromWorker')
    .throws('some-error');

  // Before pushsubscriptionchange
  let subscription = await Database.getSubscription();
  t.deepEqual(subscription.deviceId, null);
  t.deepEqual(subscription.subscriptionToken, null);

  const event = new MockPushSubscriptionChangeEvent();
  await runPushSubscriptionChange(event);

  // After pushsubscriptionchange
  subscription = await Database.getSubscription();
  t.deepEqual(subscription.deviceId, null);
  t.deepEqual(subscription.subscriptionToken, null);
});


/**
 * Helpers
 */
async function setInitialDatabaseState(deviceId?: string, subscriptionToken?: string) {
  const subscription = await Database.getSubscription();
  subscription.deviceId = deviceId;
  subscription.subscriptionToken = subscriptionToken;
  await Database.setSubscription(subscription);
}

async function runPushSubscriptionChange(event: PushSubscriptionChangeEvent): Promise<void> {
  const testPromise = new Promise<void>(resolve => {
    self.addEventListener("pushsubscriptionchange", async (evt: PushSubscriptionChangeEvent) => {
      await ServiceWorker.onPushSubscriptionChange(evt);
      resolve();
    });
  });
  self.dispatchEvent(event);
  await testPromise;
}
