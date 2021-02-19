
import test from 'ava';
import ServiceWorkerUtilHelper from '../../../../src/helpers/page/ServiceWorkerUtilHelper';
import { MockServiceWorker } from '../../../support/mocks/service-workers/models/MockServiceWorker';
import { MockServiceWorkerRegistration } from "../../../support/mocks/service-workers/models/MockServiceWorkerRegistration";

test('getAvailableServiceWorker() - returns instance - when only active', async t => {
  const serviceWorkerRegistration = new MockServiceWorkerRegistration();
  serviceWorkerRegistration.active = new MockServiceWorker();

  t.truthy(ServiceWorkerUtilHelper.getAvailableServiceWorker(serviceWorkerRegistration))
});

test('getAvailableServiceWorker() - returns instance - when only waiting', async t => {
  const serviceWorkerRegistration = new MockServiceWorkerRegistration();
  serviceWorkerRegistration.waiting = new MockServiceWorker();

  t.truthy(ServiceWorkerUtilHelper.getAvailableServiceWorker(serviceWorkerRegistration))
});

test('getAvailableServiceWorker() - returns instance - when only installing', async t => {
  const serviceWorkerRegistration = new MockServiceWorkerRegistration();
  serviceWorkerRegistration.installing = new MockServiceWorker();

  t.truthy(ServiceWorkerUtilHelper.getAvailableServiceWorker(serviceWorkerRegistration))
});


test('getAvailableServiceWorker() - returns null - when no ServiceWorker', async t => {
  const serviceWorkerRegistration = new MockServiceWorkerRegistration();
  t.falsy(ServiceWorkerUtilHelper.getAvailableServiceWorker(serviceWorkerRegistration))
});

// See test/unit/manager/ServiceWorkerManager.ts for other tests that cover this class
