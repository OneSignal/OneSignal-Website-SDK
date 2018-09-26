import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';

import Database from '../../../src/services/Database';
import Random from '../../support/tester/Random';


test(`database should not be shared across service worker test environment initializations`, async t => {
  let firstAppId;
  let firstDatabaseInstance;
  let firstDatabaseInstanceName;

  {
    await TestEnvironment.initializeForServiceWorker();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Random.getRandomUuid();
    firstAppId = appConfig.appId;
    firstDatabaseInstance = Database.singletonInstance;
    firstDatabaseInstanceName = Database.databaseInstanceName;
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.is(appId, firstAppId);
  }

  {
    await TestEnvironment.initializeForServiceWorker();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Random.getRandomUuid();
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.not(firstDatabaseInstance, Database.singletonInstance);
    t.not(firstDatabaseInstanceName, Database.databaseInstanceName);
    t.not(appId, firstAppId);
    t.is(appId, appConfig.appId);
  }
});

test(`database should not be shared across DOM test environment initializations`, async t => {
  let firstAppId;
  let firstDatabaseInstance;
  let firstDatabaseInstanceName;

  {
    await TestEnvironment.initialize();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Random.getRandomUuid();
    firstAppId = appConfig.appId;
    firstDatabaseInstance = Database.singletonInstance;
    firstDatabaseInstanceName = Database.databaseInstanceName;
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.is(appId, firstAppId);
  }

  {
    await TestEnvironment.initialize();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Random.getRandomUuid();
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.not(firstDatabaseInstance, Database.singletonInstance);
    t.not(firstDatabaseInstanceName, Database.databaseInstanceName);
    t.not(appId, firstAppId);
    t.is(appId, appConfig.appId);
  }
});
