import { EXTERNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setAddAliasResponse } from '__test__/support/helpers/requests';
import LoginManager from 'src/page/managers/LoginManager';
import * as detect from 'src/shared/environment/detect';
import Log from 'src/shared/libraries/Log';
import { SessionOrigin } from 'src/shared/session/constants';
import { vi, type MockInstance } from 'vitest';
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
      deactSpy = vi
        .spyOn(sm, '_notifySWToDeactivateSession')
        .mockResolvedValue(undefined);
    });

    test('_notifySWToUpsertSession posts to worker when SW supported', async () => {
      supportsServiceWorkersSpy.mockReturnValue(true);
      const unicastSpy = vi
        .spyOn(OneSignal._context._workerMessenger, '_unicast')
        .mockResolvedValue(undefined);

      await sm['_notifySWToUpsertSession'](
        'one',
        'sub',
        SessionOrigin._UserCreate,
      );
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
      const emitSpy = vi
        .spyOn(OneSignal._emitter, '_emit')
        .mockResolvedValue(OneSignal._emitter);
      await sm._upsertSession(SessionOrigin._UserCreate);
      expect(emitSpy).toHaveBeenCalledWith(OneSignal.EVENTS.SESSION_STARTED);
    });

    test('_handleVisibilityChange visible triggers upsert; hidden triggers deactivate and removes listeners', async () => {
      // ensure user present
      User._createOrGetInstance();

      vi.spyOn(
        sm,
        '_getOneSignalAndSubscriptionIds' as keyof SessionManager,
      ).mockImplementation(() => ({
        onesignalId: 'o',
        subscriptionId: 's',
      }));

      // visible and focused
      const visSpy = vi
        .spyOn(document, 'visibilityState', 'get')
        .mockReturnValue('visible' as DocumentVisibilityState);
      const focusSpy = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      notifySpy.mockResolvedValue(undefined);
      await sm._handleVisibilityChange();
      expect(notifySpy).toHaveBeenCalled();
      visSpy.mockRestore();
      focusSpy.mockRestore();

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
});
