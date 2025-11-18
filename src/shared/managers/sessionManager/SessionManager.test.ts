import { EXTERNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setAddAliasResponse } from '__test__/support/helpers/requests';
import LoginManager from 'src/page/managers/LoginManager';
import Log from 'src/shared/libraries/Log';
import { SessionOrigin } from 'src/shared/session/constants';
import { SessionManager } from './SessionManager';

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
    beforeEach(() => {
      TestEnvironment.initialize();
      vi.restoreAllMocks();
    });

    test('_notifySWToUpsertSession posts to worker when SW supported', async () => {
      const detect = await import('src/shared/environment/detect');
      vi.spyOn(detect, 'supportsServiceWorkers').mockReturnValue(true);
      const sm = new SessionManager(OneSignal._context);
      const unicastSpy = vi
        // @ts-expect-error private access
        .spyOn(OneSignal._context._workerMessenger, '_unicast')
        .mockResolvedValue(undefined as any);

      await sm['_notifySWToUpsertSession']('one', 'sub', SessionOrigin._UserCreate);
      expect(unicastSpy).toHaveBeenCalled();
    });

    test('_upsertSession does nothing when no user is present', async () => {
      // Remove user singleton
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import('src/onesignal/User')).default._singletonInstance = undefined as any;
      const detect = await import('src/shared/environment/detect');
      vi.spyOn(detect, 'supportsServiceWorkers').mockReturnValue(true);
      const sm = new SessionManager(OneSignal._context);
      const notifySpy = vi.spyOn(sm as any, '_notifySWToUpsertSession');
      await sm._upsertSession(SessionOrigin._UserCreate);
      expect(notifySpy).not.toHaveBeenCalled();
    });

    test('_upsertSession installs listeners when SW supported', async () => {
      const detect = await import('src/shared/environment/detect');
      vi.spyOn(detect, 'supportsServiceWorkers').mockReturnValue(true);
      const sm = new SessionManager(OneSignal._context);
      const setupSpy = vi.spyOn(sm as any, '_setupSessionEventListeners');
      // also stub ids retrieval path to avoid errors
      vi.spyOn(sm as any, '_getOneSignalAndSubscriptionIds').mockResolvedValue({
        onesignalId: 'one',
        subscriptionId: 'sub',
      });
      await sm._upsertSession(SessionOrigin._Focus);
      expect(setupSpy).toHaveBeenCalled();
    });

    test('_upsertSession emits SESSION_STARTED when SW not supported', async () => {
      const detect = await import('src/shared/environment/detect');
      vi.spyOn(detect, 'supportsServiceWorkers').mockReturnValue(false);
      const sm = new SessionManager(OneSignal._context);
      const emitSpy = vi.spyOn(OneSignal._emitter as any, '_emit').mockResolvedValue(undefined);
      await sm._upsertSession(SessionOrigin._UserCreate);
      expect(emitSpy).toHaveBeenCalledWith(OneSignal.EVENTS.SESSION_STARTED);
    });
  });
});
