import '../../support/polyfills/polyfills';
import test from 'ava';
import { ServiceWorker } from '../../../src/service-worker/ServiceWorker';
import { setUserAgent } from '../../support/tester/browser';
import { BrowserUserAgent, TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { Uuid } from '../../../src/models/Uuid';
import Database from '../../../src/services/Database';
import { AppConfig } from '../../../src/models/AppConfig';


test(`database should not be shared across service worker test environment initializations`, async t => {
  let firstAppId;
  let firstDatabaseInstance;
  let firstDatabaseInstanceName;

  {
    await TestEnvironment.initializeForServiceWorker();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Uuid.generate();
    firstAppId = appConfig.appId;
    firstDatabaseInstance = Database.databaseInstance;
    firstDatabaseInstanceName = Database.databaseInstanceName;
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.is(appId.toString(), firstAppId.toString());
  }

  {
    await TestEnvironment.initializeForServiceWorker();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Uuid.generate();
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.not(firstDatabaseInstance, Database.databaseInstance);
    t.not(firstDatabaseInstanceName, Database.databaseInstanceName);
    t.not(appId.toString(), firstAppId.toString());
    t.is(appId.toString(), appConfig.appId.toString());
  }
});

test(`database should not be shared across DOM test environment initializations`, async t => {
  let firstAppId;
  let firstDatabaseInstance;
  let firstDatabaseInstanceName;

  {
    await TestEnvironment.initialize();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Uuid.generate();
    firstAppId = appConfig.appId;
    firstDatabaseInstance = Database.databaseInstance;
    firstDatabaseInstanceName = Database.databaseInstanceName;
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.is(appId.toString(), firstAppId.toString());
  }

  {
    await TestEnvironment.initialize();
    const appConfig = TestEnvironment.getFakeAppConfig();
    appConfig.appId = Uuid.generate();
    await Database.setAppConfig(appConfig);
    const { appId } = await Database.getAppConfig();
    t.not(firstDatabaseInstance, Database.databaseInstance);
    t.not(firstDatabaseInstanceName, Database.databaseInstanceName);
    t.not(appId.toString(), firstAppId.toString());
    t.is(appId.toString(), appConfig.appId.toString());
  }
});
