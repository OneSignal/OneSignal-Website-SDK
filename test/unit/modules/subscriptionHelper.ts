import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import sinon from 'sinon';
import { PushSubscriptionManager } from '../../../src/shared/managers/PushSubscriptionManager';
import LocalStorage from '../../../src/shared/utils/LocalStorage';
import { PageViewManager } from '../../../src/shared/managers/PageViewManager';
import SubscriptionHelper from '../../../src/shared/helpers/SubscriptionHelper';

const sinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test('should not resubscribe user on subsequent page views if the user is already subscribed', async t => {
  sinonSandbox.stub(LocalStorage, 'getIsPushNotificationsEnabled').returns("true");
  sinonSandbox.stub(PageViewManager.prototype, 'getPageViewCount').returns(2);
  const subscribeSpy = sinonSandbox.spy(PushSubscriptionManager.prototype, 'subscribe');

  await SubscriptionHelper.registerForPush();
  t.true(subscribeSpy.notCalled);
});

test('should subscribe user on subsequent page views if the user is not subscribed', async t => {
  sinonSandbox.stub(OneSignal, 'isPushNotificationsEnabled').resolves(false);
  sinonSandbox.stub(PageViewManager.prototype, 'getPageViewCount').returns(2);
  sinonSandbox.stub(PushSubscriptionManager.prototype, 'registerSubscription').resolves();

  const subscribeStub = sinonSandbox.stub(PushSubscriptionManager.prototype, 'subscribe').resolves(null);
  await SubscriptionHelper.registerForPush();
  t.true(subscribeStub.called);
});

test('should resubscribe an already subscribed user on first page view', async t => {
  sinonSandbox.stub(OneSignal, 'isPushNotificationsEnabled').resolves(true);
  sinonSandbox.stub(PageViewManager.prototype, 'getPageViewCount').returns(1);
  sinonSandbox.stub(PushSubscriptionManager.prototype, 'registerSubscription').resolves();

  const subscribeStub = sinonSandbox.stub(PushSubscriptionManager.prototype, 'subscribe').resolves(null);
  await SubscriptionHelper.registerForPush();

  t.true(subscribeStub.called);
});
