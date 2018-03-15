import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import MainHelper from '../../../src/helpers/MainHelper';
import * as sinon from 'sinon';
import SubscriptionHelper from '../../../src/helpers/SubscriptionHelper';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { AppConfig } from '../../../src/models/AppConfig';

import Context from '../../../src/models/Context';
import { SessionManager } from '../../../src/managers/SessionManager';
import Random from '../../support/tester/Random';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
});

test('should not resubscribe user on subsequent page views if the user is already subscribed', async t => {
  const isPushEnabledStub = sinon.stub(OneSignal, 'isPushNotificationsEnabled').resolves(true);
  const getSessionCountStub = sinon.stub(SessionManager.prototype, 'getPageViewCount').returns(2);
  const subscribeSpy = sinon.spy(SubscriptionManager.prototype, 'subscribe');

  await SubscriptionHelper.registerForPush();

  t.true(subscribeSpy.notCalled);

  subscribeSpy.restore();
  isPushEnabledStub.restore();
  getSessionCountStub.restore();
});

test('should subscribe user on subsequent page views if the user is not subscribed', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const isPushEnabledStub = sinon.stub(OneSignal, 'isPushNotificationsEnabled').resolves(false);
  const getSessionCountStub = sinon.stub(SessionManager.prototype, 'getPageViewCount').returns(2);
  const subscribeStub = sinon.stub(SubscriptionManager.prototype, 'subscribe').resolves(null);

  await SubscriptionHelper.registerForPush();

  t.true(subscribeStub.called);

  subscribeStub.restore();
  isPushEnabledStub.restore();
  getSessionCountStub.restore();
});

test('should resubscribe an already subscribed user on first page view', async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);

  const isPushEnabledStub = sinon.stub(OneSignal, 'isPushNotificationsEnabled').resolves(true);
  const getSessionCountStub = sinon.stub(SessionManager.prototype, 'getPageViewCount').returns(1);
  const subscribeStub = sinon.stub(SubscriptionManager.prototype, 'subscribe').resolves(null);

  await SubscriptionHelper.registerForPush();

  t.true(subscribeStub.called);

  subscribeStub.restore();
  isPushEnabledStub.restore();
  getSessionCountStub.restore();
});
