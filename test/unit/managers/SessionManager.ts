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
import { Uuid } from '../../../src/models/Uuid';
import Context from '../../../src/models/Context';
import { SessionManager } from '../../../src/managers/SessionManager';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  OneSignal.context = new Context(appConfig);
});

test('page view count for first page view should be zero', async t => {
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 0);
});

test('page view count should increment', async t => {
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 0);
  OneSignal.context.sessionManager.incrementPageViewCount();
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
});

test('page view count should only increment once for the current page view', async t => {
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 0);
  for (let i = 0; i < 5; i++) {
    // Even though we're calling this 5 times
    OneSignal.context.sessionManager.incrementPageViewCount();
  }
  // The final page count should only be incremented by one
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
});

test('page view count should increment per page-refresh', async t => {
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 0);
  OneSignal.context.sessionManager.incrementPageViewCount();
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);

  OneSignal.context.sessionManager.simulatePageNavigationOrRefresh();

  t.is(OneSignal.context.sessionManager.getPageViewCount(), 1);
  OneSignal.context.sessionManager.incrementPageViewCount();
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 2);

  OneSignal.context.sessionManager.simulatePageNavigationOrRefresh();

  t.is(OneSignal.context.sessionManager.getPageViewCount(), 2);
  OneSignal.context.sessionManager.incrementPageViewCount();
  t.is(OneSignal.context.sessionManager.getPageViewCount(), 3);
});

