import ModelCache from "../../../src/core/caching/ModelCache";
import { TestEnvironment } from "../../support/environment/TestEnvironment";
import Database from "../../../src/shared/services/Database";
import LoginManager from "../../../src/page/managers/LoginManager";
import { CoreModuleDirector } from "../../../src/core/CoreModuleDirector";
import { setupLoginStubs } from "../../support/helpers/login";
import { RequestService } from "../../../src/core/requestService/RequestService";
import { getDummyIdentityOSModel } from "../../support/helpers/core";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { APP_ID, DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN, DUMMY_ONESIGNAL_ID } from "../../support/constants";
import { IdentityExecutor } from "../../../src/core/executors/IdentityExecutor";
import { PropertiesExecutor } from "../../../src/core/executors/PropertiesExecutor";
import { SubscriptionExecutor } from "../../../src/core/executors/SubscriptionExecutor";
import LocalStorage from "../../../src/shared/utils/LocalStorage";
import OneSignalApiBase from "../../../src/shared/api/OneSignalApiBase";
import AliasPair from "../../../src/core/requestService/AliasPair";
import AliasType from "../../../src/core/requestService/AliasType";

// suppress all internal logging
jest.mock("../../../src/shared/libraries/Log");

describe('User verification tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    test.stub(PropertiesExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
    test.stub(IdentityExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
    test.stub(SubscriptionExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('If login with JWT token, save it to the database', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const setJWTForExternalIdSpy = jest.spyOn(LocalStorage, 'setJWTForExternalId');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    }, 200);

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);

    expect(setJWTForExternalIdSpy).toHaveBeenCalledWith(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
  });

  test('If using identity verification, user GET request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const onesignalApiBaseGetSpy = jest.spyOn(OneSignalApiBase, 'get');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    });

    // get is done in login method
    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);

    const action = `apps/${APP_ID}/users/by/${AliasType.ExternalId}/${DUMMY_EXTERNAL_ID}`;
    expect(onesignalApiBaseGetSpy).toHaveBeenCalledWith(action, null, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });

  test('If using identity verification, user PATCH request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true, initUser: true });
    setupLoginStubs();

    const identity = {
      external_id: DUMMY_EXTERNAL_ID,
    };

    test.nock({ identity });

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
    const onesignalApiBasePatchSpy = jest.spyOn(OneSignalApiBase, 'patch');
    OneSignal.User.addTags({ test: 'test' });

    const action = `apps/${APP_ID}/users/by/${AliasType.OneSignalId}/${DUMMY_ONESIGNAL_ID}`;
    expect(onesignalApiBasePatchSpy).toHaveBeenCalledWith(action, identity, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });

  test('If using identity verification, user DELETE request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const onesignalApiBaseDeleteSpy = jest.spyOn(OneSignalApiBase, 'delete');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
    OneSignal.User.removeExternalUserId();

    const action = `apps/${APP_ID}/users/by/${AliasType.ExternalId}/${DUMMY_EXTERNAL_ID}`;
    expect(onesignalApiBaseDeleteSpy).toHaveBeenCalledWith(action, null, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });

  test('If using identity verification, identity PATCH request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const onesignalApiBasePatchSpy = jest.spyOn(OneSignalApiBase, 'patch');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
    OneSignal.User.addAlias('myLabel', 'myId');

    const action = `apps/${APP_ID}/users/by/${AliasType.OneSignalId}${DUMMY_ONESIGNAL_ID}/identity`;
    expect(onesignalApiBasePatchSpy).toHaveBeenCalledWith(action, null, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });

  test('If using identity verification, identity DELETE request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const onesignalApiBaseDeleteSpy = jest.spyOn(OneSignalApiBase, 'delete');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
    OneSignal.User.removeExternalUserId();

    const action = `apps/${APP_ID}/users/by/${AliasType.OneSignalId}${DUMMY_ONESIGNAL_ID}/identity`;
    expect(onesignalApiBaseDeleteSpy).toHaveBeenCalledWith(action, null, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });

  test('If using identity verification, identity GET request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const onesignalApiBaseGetSpy = jest.spyOn(OneSignalApiBase, 'get');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
    OneSignal.User.getAliases();

    const action = `apps/${APP_ID}/users/by/${AliasType.OneSignalId}${DUMMY_ONESIGNAL_ID}/identity`;
    expect(onesignalApiBaseGetSpy).toHaveBeenCalledWith(action, null, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });

  test('If using identity verification, subscription POST request should be sent with JWT token', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const onesignalApiBasePostSpy = jest.spyOn(OneSignalApiBase, 'post');

    test.nock({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      }
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID, DUMMY_JWT_TOKEN);
    OneSignal.User.setSubscription(true);

    const action = `apps/${APP_ID}/users/by/${AliasType.OneSignalId}${DUMMY_ONESIGNAL_ID}/subscriptions`;
    expect(onesignalApiBasePostSpy).toHaveBeenCalledWith(action, null, { Authorization: `Bearer ${DUMMY_JWT_TOKEN}` });
  });
});
