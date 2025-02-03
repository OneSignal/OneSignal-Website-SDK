import { TestEnvironment } from '../../support/environment/TestEnvironment';
import Database from '../../../src/shared/services/Database';
import LoginManager from '../../../src/page/managers/LoginManager';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import { setupLoginStubs } from '../../support/helpers/login';
import { RequestService } from '../../../src/core/requestService/RequestService';
import { getDummyIdentityOSModel } from '../../support/helpers/core';
import { ModelName } from '../../../src/core/models/SupportedModels';
import {
  DUMMY_EXTERNAL_ID,
  DUMMY_EXTERNAL_ID_2,
  DUMMY_ONESIGNAL_ID,
} from '../../support/constants';
import { IdentityExecutor } from '../../../src/core/executors/IdentityExecutor';
import { PropertiesExecutor } from '../../../src/core/executors/PropertiesExecutor';
import { SubscriptionExecutor } from '../../../src/core/executors/SubscriptionExecutor';
import LocalStorage from '../../../src/shared/utils/LocalStorage';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';

// suppress all internal logging
vi.mock('../../../src/shared/libraries/Log');
vi.spyOn(
  PropertiesExecutor.prototype,
  'getOperationsFromCache',
).mockReturnValue([]);
vi.spyOn(IdentityExecutor.prototype, 'getOperationsFromCache').mockReturnValue(
  [],
);
vi.spyOn(
  SubscriptionExecutor.prototype,
  'getOperationsFromCache',
).mockReturnValue([]);

const createUserSpy = vi.spyOn(RequestService, 'createUser');
const transferSubscriptionSpy = vi.spyOn(LoginManager, 'transferSubscription');
// api mocks
const identityURL = `**/apps/*/users/by/onesignal_id/*/identity`;

server.use(
  http.post(`**/apps/*/users`, () =>
    HttpResponse.json({ result: {}, status: 200 }),
  ),
);

describe('Login tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('If privacy consent is required but not given, do not login', async () => {
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
    });
    LocalStorage.setConsentRequired(true);

    vi.spyOn(Database, 'getConsentGiven').mockResolvedValue(false);

    await expect(LoginManager.login('rodrigo')).rejects.toThrow(
      'Login: Consent required but not given, skipping login',
    );
  });

  test('Login twice with same user -> only one call to identify user', async () => {
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
      useMockPushSubscriptionModel: true,
    });
    setupLoginStubs();

    const identifyOrUpsertUserSpy = vi
      .spyOn(LoginManager, 'identifyOrUpsertUser')
      .mockResolvedValue({
        identity: {
          external_id: DUMMY_EXTERNAL_ID,
          onesignal_id: DUMMY_ONESIGNAL_ID,
        },
      });

    await LoginManager.login(DUMMY_EXTERNAL_ID);
    await LoginManager.login(DUMMY_EXTERNAL_ID);

    expect(identifyOrUpsertUserSpy).toHaveBeenCalledTimes(1);
  });

  test('Login twice with different user -> logs in to second user', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();

    const identifyOrUpsertUserSpy = vi.spyOn(
      LoginManager,
      'identifyOrUpsertUser',
    );

    await LoginManager.login(DUMMY_EXTERNAL_ID);
    await LoginManager.login('rodrigo2');

    expect(identifyOrUpsertUserSpy).toHaveBeenCalledTimes(2);
  });

  test('If there is anything on the delta queue, it gets processed before login', async () => {
    await TestEnvironment.initialize({ useMockIdentityModel: true });
    setupLoginStubs();
    const external_id = DUMMY_EXTERNAL_ID;
    vi.spyOn(LoginManager, 'identifyOrUpsertUser').mockResolvedValue({
      identity: {
        external_id,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      },
    });

    const forceProcessSpy = vi.spyOn(
      CoreModuleDirector.prototype,
      'forceDeltaQueueProcessingOnAllExecutors',
    );

    await LoginManager.login(external_id);

    // TO DO: test the order of operations (force process deltas should occur at beginning of login process)
    expect(forceProcessSpy).toHaveBeenCalledTimes(1);
  });

  test('Upsert user payload only contains one alias', async () => {
    setupLoginStubs();
    await TestEnvironment.initialize();
    const identityModel = getDummyIdentityOSModel();

    // to upsert, the user must already be identified (have an external_id)
    identityModel.set('external_id', 'pavel');
    identityModel.setOneSignalId(DUMMY_ONESIGNAL_ID);

    OneSignal.coreDirector.add(ModelName.Identity, identityModel);

    const identifyOrUpsertUserSpy = vi.spyOn(
      LoginManager,
      'identifyOrUpsertUser',
    );

    await LoginManager.login(DUMMY_EXTERNAL_ID);

    // get result of identifyOrUpsertUser
    await identifyOrUpsertUserSpy.mock.results[0].value;

    // second argument to createUser is the payload object
    const payload = createUserSpy.mock.calls[0][1];

    expect(Object.keys(payload.identity!).length).toBe(1);
  });

  test('Identify user payload only contains one alias', async () => {
    server.use(
      http.patch(`**/apps/*/users/by/onesignal_id/*/identity`, () =>
        HttpResponse.json({ result: {}, status: 200 }),
      ),
    );

    setupLoginStubs();
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
    });

    const identifyOrUpsertUserSpy = vi.spyOn(
      LoginManager,
      'identifyOrUpsertUser',
    );
    const identifyUserSpy = vi.spyOn(RequestService, 'addAlias');

    await LoginManager.login(DUMMY_EXTERNAL_ID);

    // get result of identifyOrUpsertUser
    await identifyOrUpsertUserSpy.mock.results[0].value;

    // second argument to identifyUser is the payload object
    const identity = identifyUserSpy.mock.calls[0][2];

    expect(JSON.parse(JSON.stringify(identity))).toEqual({
      external_id: DUMMY_EXTERNAL_ID,
    });
  });

  test('If we login with an existing alias 409 we transfer the push subscription', async () => {
    server.use(
      http.patch(identityURL, () => HttpResponse.json(null, { status: 409 })),
    );

    setupLoginStubs();
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
      useMockPushSubscriptionModel: true,
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID);

    expect(transferSubscriptionSpy).toHaveBeenCalledTimes(1);
  });

  test('If login fails, we fetch and hydrate the previous user', async () => {
    server.use(
      http.patch(identityURL, () => HttpResponse.json(null, { status: 400 })),
    );

    setupLoginStubs();
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
      useMockPushSubscriptionModel: true,
    });

    const fetchAndHydrateSpy = vi.spyOn(LoginManager, 'fetchAndHydrate');

    await LoginManager.login(DUMMY_EXTERNAL_ID);
    expect(fetchAndHydrateSpy).toHaveBeenCalledTimes(1);
  });

  test.todo('If login with JWT token, save it to the database');

  test('Login called before any Subscriptions, should save external_id but not create User', async () => {
    server.use(
      http.post(`**/apps/*/users`, () =>
        HttpResponse.json({ result: {}, status: 200 }),
      ),
    );

    setupLoginStubs();
    await TestEnvironment.initialize();

    OneSignal.coreDirector.add(ModelName.Identity, getDummyIdentityOSModel());

    await LoginManager.login(DUMMY_EXTERNAL_ID);

    expect(OneSignal.coreDirector.getIdentityModel().data.external_id).toBe(
      DUMMY_EXTERNAL_ID,
    );

    // User should NOT be created, as we have no subscriptions yet.
    expect(createUserSpy.mock.calls.length).toBe(0);
  });

  test('Login updates externalId on all models', async () => {
    setupLoginStubs();
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
      useMockPushSubscriptionModel: true,
    });

    vi.spyOn(LoginManager, 'identifyOrUpsertUser').mockResolvedValue({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      },
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID);

    expect(OneSignal.coreDirector.getIdentityModel().externalId).toBe(
      DUMMY_EXTERNAL_ID,
    );

    expect(OneSignal.coreDirector.getPropertiesModel().externalId).toBe(
      DUMMY_EXTERNAL_ID,
    );

    const subs = await OneSignal.coreDirector.getAllSubscriptionsModels();

    expect(
      subs.every(
        (sub: { externalId: string }) => sub.externalId === DUMMY_EXTERNAL_ID,
      ),
    ).toBe(true);
  });

  test('Login twice updates current externalId on all models', async () => {
    setupLoginStubs();
    await TestEnvironment.initialize({
      useMockIdentityModel: true,
    });

    vi.spyOn(LoginManager, 'identifyOrUpsertUser').mockResolvedValue({
      identity: {
        external_id: DUMMY_EXTERNAL_ID,
        onesignal_id: DUMMY_ONESIGNAL_ID,
      },
    });

    await LoginManager.login(DUMMY_EXTERNAL_ID);
    await LoginManager.login(DUMMY_EXTERNAL_ID_2);

    expect(OneSignal.coreDirector.getIdentityModel().externalId).toBe(
      DUMMY_EXTERNAL_ID_2,
    );

    expect(OneSignal.coreDirector.getPropertiesModel().externalId).toBe(
      DUMMY_EXTERNAL_ID_2,
    );

    const subs = await OneSignal.coreDirector.getAllSubscriptionsModels();

    expect(
      subs.every(
        (sub: { externalId: string }) => sub.externalId === DUMMY_EXTERNAL_ID_2,
      ),
    ).toBe(true);
  });
});
