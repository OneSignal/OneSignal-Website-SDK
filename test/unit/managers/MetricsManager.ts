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
import * as timemachine from "timemachine";

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Uuid.generate();
  OneSignal.context = new Context(appConfig);
});

test('should not collect pageviews if system clock is out of sync', async t => {
  timemachine.config({
    dateString: "February 8 2018"
  });
  t.true(OneSignal.context.metricsManager.shouldCollectPageView());

  // Anything before February 8th 2018 shouldn't be collecting data
  timemachine.config({
    dateString: "February 8 2017"
  });
  t.false(OneSignal.context.metricsManager.shouldCollectPageView());

  timemachine.config({
    dateString: "February 7 2018"
  });
  t.false(OneSignal.context.metricsManager.shouldCollectPageView());

  timemachine.config({
    dateString: "January 5 2018"
  });
  t.false(OneSignal.context.metricsManager.shouldCollectPageView());

  timemachine.config({
    dateString: "February 9 1980"
  });
  t.false(OneSignal.context.metricsManager.shouldCollectPageView());

  // Feb 9th should be okay
  timemachine.config({
    dateString: "February 9 2018"
  });
  t.true(OneSignal.context.metricsManager.shouldCollectPageView());

  // Feb 10th should not be okay
  timemachine.config({
    dateString: "February 10 2018"
  });
  t.false(OneSignal.context.metricsManager.shouldCollectPageView());
});
