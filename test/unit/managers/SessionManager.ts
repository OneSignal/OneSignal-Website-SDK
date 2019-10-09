import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import MainHelper from '../../../src/helpers/MainHelper';
import sinon from 'sinon';
import SubscriptionHelper from '../../../src/helpers/SubscriptionHelper';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { AppConfig } from '../../../src/models/AppConfig';

import Context from '../../../src/models/Context';
import { PageViewManager } from '../../../src/managers/PageViewManager';
import Random from '../../support/tester/Random';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
});

test('page view count for first page view should be zero', async t => {
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 0);
});

test('page view count should increment', async t => {
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 0);
  OneSignal.context.pageViewManager.incrementPageViewCount();
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
});

test('page view count should only increment once for the current page view', async t => {
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 0);
  for (let i = 0; i < 5; i++) {
    // Even though we're calling this 5 times
    OneSignal.context.pageViewManager.incrementPageViewCount();
  }
  // The final page count should only be incremented by one
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
});

test('page view count should increment per page-refresh', async t => {
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 0);
  OneSignal.context.pageViewManager.incrementPageViewCount();
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);

  OneSignal.context.pageViewManager.simulatePageNavigationOrRefresh();

  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 1);
  OneSignal.context.pageViewManager.incrementPageViewCount();
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 2);

  OneSignal.context.pageViewManager.simulatePageNavigationOrRefresh();

  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 2);
  OneSignal.context.pageViewManager.incrementPageViewCount();
  t.is(OneSignal.context.pageViewManager.getPageViewCount(), 3);
});

