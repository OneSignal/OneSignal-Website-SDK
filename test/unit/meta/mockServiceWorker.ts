import '../../support/polyfills/polyfills';

import test from 'ava';

import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { MockServiceWorkerContainer } from "../../support/mocks/service-workers/models/MockServiceWorkerContainer";
import { MockServiceWorker } from "../../support/mocks/service-workers/models/MockServiceWorker";
import { MockServiceWorkerRegistration } from "../../support/mocks/service-workers/models/MockServiceWorkerRegistration";

class TestMockServiceWorkerContainer extends MockServiceWorkerContainer {
}

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  (global as any).navigator.serviceWorker = new TestMockServiceWorkerContainer();
});

test('mock service worker browser API properties should exist', async t => {
  t.true(navigator.serviceWorker instanceof MockServiceWorkerContainer);
  t.true(navigator.serviceWorker.getRegistration instanceof Function);
  t.true(navigator.serviceWorker.getRegistrations instanceof Function);
  t.true(navigator.serviceWorker.register instanceof Function);
  t.true(navigator.serviceWorker.addEventListener instanceof Function);
});

test('mock service worker should not return an existing registration for a clean run', async t => {
  t.is(navigator.serviceWorker.controller, null);

  const registration = await navigator.serviceWorker.getRegistration();
  t.is(registration, undefined);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, []);
});


test('mock service worker registration should return the registered worker', async t => {
  await navigator.serviceWorker.register('/worker.js', { scope: '/' });

  t.true(navigator.serviceWorker.controller instanceof MockServiceWorker);

  const registration = await navigator.serviceWorker.getRegistration();
  t.true(registration instanceof MockServiceWorkerRegistration);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, [registration]);
});

test('mock service worker getRegistrations should return multiple registered workers', async t => {
  const expectedRegistrations = [] as ServiceWorkerRegistration[];
  expectedRegistrations.push(await navigator.serviceWorker.register('/workerA.js', { scope: '/' }));
  expectedRegistrations.push(await navigator.serviceWorker.register('/workerB.js', { scope: '/mypath/' }));

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, expectedRegistrations);
});

test('mock service worker getRegistration should return higher path worker', async t => {
  const expected = await navigator.serviceWorker.register('/workerA.js', { scope: '/' });
  const actual = await navigator.serviceWorker.getRegistration("/some/scope/");
  t.deepEqual(actual, expected);
});

test('mock service worker getRegistration should return specific path if a higher path worker exists too', async t => {
  const expected = await navigator.serviceWorker.register('/workerB.js', { scope: '/mypath/' });
  await navigator.serviceWorker.register('/workerA.js', { scope: '/' });
  const actual = await navigator.serviceWorker.getRegistration("/mypath/");
  t.deepEqual(actual, expected);
});

test('mock service worker unregistration should return no registered workers', async t => {
  await navigator.serviceWorker.register('/worker.js', { scope: '/' });

  const initialRegistration = await navigator.serviceWorker.getRegistration();
  await initialRegistration!.unregister();

  const postUnsubscribeRegistration = await navigator.serviceWorker.getRegistration();
  t.is(postUnsubscribeRegistration, undefined);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, []);
});
