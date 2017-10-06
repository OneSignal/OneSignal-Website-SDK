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
import { HttpsPermissionRequest } from '../../../src/prompts/HttpsPermissionRequest';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  OneSignal.context = new Context(appConfig);
});

test('httpsPermissionRequest prompt', async t => {
  const promptManager = OneSignal.context.promptManager;
  t.false(promptManager.isAnyPromptActive());
  promptManager.prompt(new HttpsPermissionRequest());
  t.false(promptManager.isAnyPromptActive());
});
