import '../../support/polyfills/polyfills';

import test from 'ava';
import * as sinon from 'sinon';

import { ServiceWorkerManager, ServiceWorkerActiveState } from '../../../src/managers/ServiceWorkerManager';
import Path from '../../../src/models/Path';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import ServiceWorkerRegistration from '../../support/mocks/service-workers/models/ServiceWorkerRegistration';
import ServiceWorker from '../../support/mocks/service-workers/ServiceWorker';
import { beforeEach } from '../../support/tester/typify';
import Database from '../../../src/services/Database';
import IndexedDb from '../../../src/services/IndexedDb';
import Context from '../../../src/models/Context';
import { Uuid } from '../../../src/models/Uuid';
import { AppConfig } from '../../../src/models/AppConfig';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { base64ToUint8Array, arrayBufferToBase64 } from '../../../src/utils/Encoding';
import PushManager from '../../support/mocks/service-workers/models/PushManager';
import { ServiceWorkerContainer } from '../../support/mocks/service-workers/ServiceWorkerContainer';
import PushSubscriptionOptions from '../../support/mocks/service-workers/models/PushSubscriptionOptions';
import PushSubscription from '../../support/mocks/service-workers/models/PushSubscription';
import Random from "../../support/tester/Random";

const VAPID_PUBLIC_KEY_1 = 'CAdXhdGDgXJfJccxabiFhmlyTyF17HrCsfyIj3XEhg2j-RmT4wXU7lHiBPqSKSotvtfejZlAaPywJ3E-3AxXQBj1';
const VAPID_PUBLIC_KEY_2 =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgrjd4cWBgjEtiIqh45fbzkJdlr8ir7ZidvNzMAsHP_uBQuPsn1n5QWYqJy80fkkjbf-1LH99C_y9RjLGjsesUg';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  await navigator.serviceWorker.register('/worker.js');
});

test('mock push manager properties should exist', async t => {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.getRegistration() as any;

  t.true(registration.pushManager instanceof PushManager);
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

  t.true(subscription instanceof PushSubscription);
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

