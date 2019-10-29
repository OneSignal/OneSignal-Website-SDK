import '../../support/polyfills/polyfills';

import test from 'ava';

import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import Random from "../../support/tester/Random";
import { MockPushManager } from "../../support/mocks/service-workers/models/MockPushManager";
import { MockPushSubscription } from "../../support/mocks/service-workers/models/MockPushSubscription";

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  await navigator.serviceWorker.register('/worker.js');
});

test('mock push manager properties should exist', async t => {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.getRegistration() as any;

  t.true(registration.pushManager instanceof MockPushManager);
  t.true(registration.pushManager.getSubscription instanceof Function);
  t.true(registration.pushManager.subscribe instanceof Function);
});

test('mock push manager should not return an existing subscription for a clean run', async t => {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.getRegistration() as any;

  const subscription = await registration.pushManager.getSubscription();
  t.is(subscription, null);
});

test('mock push manager should subscribe successfully', async t => {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.getRegistration() as any;

  const subscriptionOptions: PushSubscriptionOptions = {
    userVisibleOnly: true,
    applicationServerKey: Random.getRandomUint8Array(64).buffer
  };
  const subscription = await registration.pushManager.subscribe(subscriptionOptions);

  t.true(subscription instanceof MockPushSubscription);
  t.is(typeof subscription.endpoint, typeof '');
  t.true(subscription.getKey instanceof Function);
  t.deepEqual(subscription.options, subscriptionOptions);
  t.true(subscription.toJSON instanceof Function);
  t.true(subscription.unsubscribe instanceof Function);
});

test('mock push manager should unsubscribe successfully', async t => {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.getRegistration() as any;

  let subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: Random.getRandomUint8Array(64).buffer
  });
  await subscription.unsubscribe();
  subscription = await registration.pushManager.getSubscription();
  t.is(subscription, null);
});

