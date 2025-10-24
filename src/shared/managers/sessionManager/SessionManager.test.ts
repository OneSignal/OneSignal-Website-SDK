import { EXTERNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setAddAliasResponse } from '__test__/support/helpers/requests';
import LoginManager from 'src/page/managers/LoginManager';
import * as Log from 'src/shared/libraries/log';
import { SessionOrigin } from 'src/shared/session/constants';
import { SessionManager } from './SessionManager';

vi.spyOn(Log, 'error').mockImplementation(() => '');

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
});
