import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/OneSignal';
import sinon from 'sinon';
import SubscriptionHelper from '../../../src/helpers/SubscriptionHelper';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import LocalStorage from '../../../src/utils/LocalStorage';
import { PageViewManager } from '../../../src/managers/PageViewManager';

const sinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
  sinonSandbox.restore();
})

test('should not resubscribe user on subsequent page views if the user is already subscribed', async t => {
  sinonSandbox.stub(LocalStorage, 'getIsPushNotificationsEnabled').returns("true");
  sinonSandbox.stub(PageViewManager.prototype, 'getPageViewCount').returns(2);
  const subscribeSpy = sinonSandbox.spy(SubscriptionManager.prototype, 'subscribe');

  await SubscriptionHelper.registerForPush();
  t.true(subscribeSpy.notCalled);
});

test('should subscribe user on subsequent page views if the user is not subscribed', async t => {
  sinonSandbox.stub(OneSignal, 'isPushNotificationsEnabled').resolves(false);
  sinonSandbox.stub(PageViewManager.prototype, 'getPageViewCount').returns(2);
  sinonSandbox.stub(SubscriptionManager.prototype, 'registerSubscription').resolves();
  
  const subscribeStub = sinonSandbox.stub(SubscriptionManager.prototype, 'subscribe').resolves(null);
  await SubscriptionHelper.registerForPush();
  t.true(subscribeStub.called);
});

test('should resubscribe an already subscribed user on first page view', async t => {
  sinonSandbox.stub(OneSignal, 'isPushNotificationsEnabled').resolves(true);
  sinonSandbox.stub(PageViewManager.prototype, 'getPageViewCount').returns(1);
  sinonSandbox.stub(SubscriptionManager.prototype, 'registerSubscription').resolves();

  const subscribeStub = sinonSandbox.stub(SubscriptionManager.prototype, 'subscribe').resolves(null);
  await SubscriptionHelper.registerForPush();

  t.true(subscribeStub.called);
});
