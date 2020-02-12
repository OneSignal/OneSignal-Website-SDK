import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import Database from '../../../src/services/Database';
import Random from '../../support/tester/Random';
import { isNullOrUndefined } from "../../support/tester/utils";
import { initializeNewSession, Session } from "../../../src/models/Session";

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

const externalUserId = "my_test_external_id";

test('setExternalUserId saves value into database', async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  t.is(isNullOrUndefined(await Database.getExternalUserId()), true);
  await Database.setExternalUserId(externalUserId);
  t.is(await Database.getExternalUserId(), externalUserId);

  // passing undefined, null or empty string as parameter clears out value from db
  await Database.setExternalUserId(undefined);
  t.is(isNullOrUndefined(await Database.getExternalUserId()), true);

  //set it back so we can test removal
  await Database.setExternalUserId(externalUserId);
  t.is(await Database.getExternalUserId(), externalUserId);

  await Database.setExternalUserId(null);
  t.is(isNullOrUndefined(await Database.getExternalUserId()), true);

  //set it back so we can test removal
  await Database.setExternalUserId(externalUserId);
  t.is(await Database.getExternalUserId(), externalUserId);

  await Database.setExternalUserId("");
  t.is(isNullOrUndefined(await Database.getExternalUserId()), true);
});

test("getExternalUserId retrieves correct value from the database", async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  t.is(isNullOrUndefined(await Database.getExternalUserId()), true);

  await Database.setExternalUserId(externalUserId);
  t.is(await Database.getExternalUserId(), externalUserId);
});

const appId = Random.getRandomUuid();
const deviceId = Random.getRandomUuid();
const newDeviceId = Random.getRandomUuid();
const deviceType = 1;
const session: Session = initializeNewSession({ deviceId, appId, deviceType });

test("upsertSession - insert & update", async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  let currentSession = await Database.getCurrentSession();
  t.is(currentSession, null);

  // insert
  await Database.upsertSession(session);
  currentSession = await Database.getCurrentSession();
  t.not(currentSession, null);
  t.is(currentSession!.deviceId, deviceId);
  t.is(currentSession!.appId, appId);
  t.is(currentSession!.deviceType, deviceType);

  // update
  currentSession!.deviceId = newDeviceId;
  await Database.upsertSession(currentSession!);

  currentSession = await Database.getCurrentSession();
  t.not(currentSession, null);
  t.is(currentSession!.deviceId, newDeviceId);
  t.is(currentSession!.appId, appId);
  t.is(currentSession!.deviceType, deviceType);
});

test("cleanupCurrentSession", async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  let currentSession = await Database.getCurrentSession();
  t.is(currentSession, null);

  // insert
  await Database.upsertSession(session);
  currentSession = await Database.getCurrentSession();
  t.not(currentSession, null);
  t.is(currentSession!.deviceId, deviceId);
  t.is(currentSession!.appId, appId);
  t.is(currentSession!.deviceType, deviceType);

  // remove
  await Database.cleanupCurrentSession();

  currentSession = await Database.getCurrentSession();
  t.is(currentSession, null);
});
