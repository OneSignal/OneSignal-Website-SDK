import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  getHandler,
  requestHeadersFn,
  setAddAliasResponse,
  setUpdateUserResponse,
  updateUserFn,
} from '__test__/support/helpers/requests';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import LoginManager from 'src/page/managers/LoginManager';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import * as detect from 'src/shared/environment/detect';
import { setJwtRequirement } from 'src/shared/helpers/localStorage';
import { setPageViewCount } from 'src/shared/helpers/pageview';
import Log from 'src/shared/libraries/Log';
import { SessionOrigin } from 'src/shared/session/constants';
import { beforeEach, describe, expect, test, vi, type MockInstance } from 'vite-plus/test';

import User from '../../../onesignal/User';
import { SessionManager } from './SessionManager';
const supportsServiceWorkersSpy = vi.spyOn(detect, 'supportsServiceWorkers');

vi.spyOn(Log, '_error').mockImplementation(() => '');

describe('SessionManager', () => {
  describe('Switching Users', () => {
    beforeEach(() => {
      setAddAliasResponse();
      TestEnvironment.initialize();
    });

    test('handleOnFocus should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._handleOnFocus(new Event('{}'));
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });

    test('handleOnFocus should wait for logout promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.logout();
        return 'logout';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._handleOnFocus(new Event('{}'));
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('logout');
    });

    test('handleOnBlur should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._handleOnBlur(new Event('{}'));
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });

    test('handleOnBlur should wait for logout promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.logout();
        return 'logout';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._handleOnBlur(new Event('{}'));
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('logout');
    });

    test('handleVisibilityChange should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._handleVisibilityChange();
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });

    test('handleOnBeforeUnload should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._handleOnBeforeUnload();
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });

    test('upsertSession should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal._context);
      const sessionPromise = (async function () {
        await sessionManager._upsertSession(SessionOrigin._UserCreate);
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });
  });

  describe('Core behaviors', () => {
    let sm: SessionManager;
    let notifySpy: MockInstance;
    let deactSpy: MockInstance;

    beforeEach(() => {
      TestEnvironment.initialize();
      sm = new SessionManager(OneSignal._context);
      notifySpy = vi.spyOn(sm, '_notifySWToUpsertSession');
      deactSpy = vi.spyOn(sm, '_notifySWToDeactivateSession').mockResolvedValue(undefined);
    });

    test('_notifySWToUpsertSession posts to worker when SW supported', async () => {
      supportsServiceWorkersSpy.mockReturnValue(true);
      const unicastSpy = vi
        .spyOn(OneSignal._context._workerMessenger, '_unicast')
        .mockResolvedValue(undefined);

      await sm['_notifySWToUpsertSession']('one', 'sub', SessionOrigin._UserCreate);
      expect(unicastSpy).toHaveBeenCalled();
    });

    test('_upsertSession does nothing when no user is present', async () => {
      supportsServiceWorkersSpy.mockReturnValue(true);
      await sm._upsertSession(SessionOrigin._UserCreate);
      expect(notifySpy).not.toHaveBeenCalled();
    });

    test('_upsertSession installs listeners when SW supported', async () => {
      supportsServiceWorkersSpy.mockReturnValue(true);
      const setupSpy = vi.spyOn(sm, '_setupSessionEventListeners');
      await sm._upsertSession(SessionOrigin._Focus);
      expect(setupSpy).toHaveBeenCalled();
    });

    test('_upsertSession emits SESSION_STARTED when SW not supported', async () => {
      supportsServiceWorkersSpy.mockReturnValue(false);
      const emitSpy = vi.spyOn(OneSignal._emitter, '_emit').mockResolvedValue(OneSignal._emitter);
      await sm._upsertSession(SessionOrigin._UserCreate);
      expect(emitSpy).toHaveBeenCalledWith(OneSignal.EVENTS.SESSION_STARTED);
    });

    test('_handleVisibilityChange visible triggers upsert; hidden triggers deactivate and removes listeners', async () => {
      // ensure user present
      User._createOrGetInstance();

      vi.spyOn(sm, '_getOneSignalAndSubscriptionIds').mockResolvedValue({
        onesignalId: 'o',
        subscriptionId: 's',
      });

      // visible and focused
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(
        'visible' as DocumentVisibilityState,
      );
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      notifySpy.mockResolvedValue(undefined);
      await sm._handleVisibilityChange();
      expect(notifySpy).toHaveBeenCalled();

      // hidden path removes listeners
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(
        'hidden' as DocumentVisibilityState,
      );
      deactSpy.mockResolvedValue(undefined);
      OneSignal._cache.isFocusEventSetup = true;
      OneSignal._cache.isBlurEventSetup = true;
      OneSignal._cache.focusHandler = () => undefined;
      OneSignal._cache.blurHandler = () => undefined;
      await sm._handleVisibilityChange();
      expect(deactSpy).toHaveBeenCalled();
      expect(OneSignal._cache.isFocusEventSetup).toBe(false);
      expect(OneSignal._cache.isBlurEventSetup).toBe(false);
    });

    test('_handleOnFocus/Blur target guard prevents duplicate', async () => {
      // ensure user present
      User._createOrGetInstance();
      notifySpy.mockResolvedValue(undefined);
      deactSpy.mockResolvedValue(undefined);
      await sm._handleOnFocus(new Event('focus'));
      await sm._handleOnBlur(new Event('blur'));
      expect(notifySpy).not.toHaveBeenCalled();
      expect(deactSpy).not.toHaveBeenCalled();
    });
  });

  describe('_sendOnSessionUpdateFromPage', () => {
    const JWT = 'header.payload.signature';
    const externalIdUri = `**/apps/${APP_ID}/users/by/external_id/${EXTERNAL_ID}`;
    const onSessionPayload = { refresh_device_metadata: true, deltas: { session_count: 1 } };
    let sm: SessionManager;

    const lastRequest = () => {
      const [headers, url] = requestHeadersFn.mock.calls.at(-1)!;
      return { headers, url };
    };

    beforeEach(async () => {
      localStorage.clear();
      TestEnvironment.initialize();
      setPageViewCount(1);
      await setupSubModelStore({ id: SUB_ID });
      updateIdentityModel('external_id', EXTERNAL_ID);
      sm = new SessionManager(OneSignal._context);
    });

    test('IV inactive: addresses the user by onesignal_id with no bearer', async () => {
      OneSignal._coreDirector._jwtTokenStore._putJwt(EXTERNAL_ID, JWT);
      setUpdateUserResponse();

      await sm._sendOnSessionUpdateFromPage();

      expect(updateUserFn).toHaveBeenCalledExactlyOnceWith(onSessionPayload);
      const { headers, url } = lastRequest();
      expect(url).toContain(`/users/by/onesignal_id/${ONESIGNAL_ID}`);
      expect(headers.authorization).toBeUndefined();
      expect(headers['onesignal-subscription-id']).toBe(SUB_ID);
    });

    test('IV active: addresses the user by external_id and carries the bearer', async () => {
      setJwtRequirement(JwtRequirement._Required);
      OneSignal._coreDirector._jwtTokenStore._putJwt(EXTERNAL_ID, JWT);
      getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });

      await sm._sendOnSessionUpdateFromPage();

      expect(updateUserFn).toHaveBeenCalledExactlyOnceWith(onSessionPayload);
      const { headers, url } = lastRequest();
      expect(url).toContain(`/users/by/external_id/${EXTERNAL_ID}`);
      expect(headers.authorization).toBe(`Bearer ${JWT}`);
    });

    test('IV active with an anonymous user: no request', async () => {
      setJwtRequirement(JwtRequirement._Required);
      updateIdentityModel('external_id', undefined);
      setUpdateUserResponse();

      await sm._sendOnSessionUpdateFromPage();

      expect(requestHeadersFn).not.toHaveBeenCalled();
    });

    test('IV active without a stored token: no request', async () => {
      setJwtRequirement(JwtRequirement._Required);
      getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });

      await sm._sendOnSessionUpdateFromPage();

      expect(requestHeadersFn).not.toHaveBeenCalled();
    });

    test('a 401 removes the token that was sent and fires userJwtInvalidated', async () => {
      setJwtRequirement(JwtRequirement._Required);
      const store = OneSignal._coreDirector._jwtTokenStore;
      store._putJwt(EXTERNAL_ID, JWT);
      const invalidated = vi.fn();
      store._addUserJwtInvalidatedListener(invalidated);
      getHandler({ uri: externalIdUri, method: 'patch', status: 401 });

      await sm._sendOnSessionUpdateFromPage();

      expect(store._getJwt(EXTERNAL_ID)).toBeUndefined();
      expect(invalidated).toHaveBeenCalledExactlyOnceWith({ externalId: EXTERNAL_ID });
    });

    test('a 401 keeps a token stored after the request went out', async () => {
      setJwtRequirement(JwtRequirement._Required);
      const store = OneSignal._coreDirector._jwtTokenStore;
      store._putJwt(EXTERNAL_ID, JWT);
      const invalidated = vi.fn();
      store._addUserJwtInvalidatedListener(invalidated);
      server.use(
        http.patch(externalIdUri, () => {
          store._putJwt(EXTERNAL_ID, 'fresh-jwt');
          return HttpResponse.json({}, { status: 401 });
        }),
      );

      await sm._sendOnSessionUpdateFromPage();

      expect(store._getJwt(EXTERNAL_ID)).toBe('fresh-jwt');
      expect(invalidated).not.toHaveBeenCalled();
    });

    test('a 401 while IV is inactive leaves the store alone', async () => {
      const store = OneSignal._coreDirector._jwtTokenStore;
      store._putJwt(EXTERNAL_ID, JWT);
      getHandler({
        uri: `**/apps/${APP_ID}/users/by/onesignal_id/${ONESIGNAL_ID}`,
        method: 'patch',
        status: 401,
      });

      await sm._sendOnSessionUpdateFromPage();

      expect(store._getJwt(EXTERNAL_ID)).toBe(JWT);
    });
  });
});
