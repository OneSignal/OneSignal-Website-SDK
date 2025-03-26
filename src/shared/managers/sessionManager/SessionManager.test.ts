import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SessionManager } from './SessionManager';

import {
  DUMMY_EXTERNAL_ID,
  DUMMY_ONESIGNAL_ID,
} from '__test__/support/constants';
import { setupLoginStubs } from '__test__/support/helpers/login';
import LoginManager from 'src/page/managers/LoginManager';
import { SessionOrigin } from 'src/shared/models/Session';

describe('SessionManager', () => {
  describe('Switching Users', () => {
    beforeEach(async () => {
      await TestEnvironment.initialize({
        useMockIdentityModel: true,
      });

      setupLoginStubs();
      vi.spyOn(LoginManager, 'identifyOrUpsertUser').mockResolvedValue({
        identity: {
          external_id: DUMMY_EXTERNAL_ID,
          onesignal_id: DUMMY_ONESIGNAL_ID,
        },
      });
    });

    test('handleOnFocus should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(DUMMY_EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.handleOnFocus(new Event('{}'));
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

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.handleOnFocus(new Event('{}'));
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('logout');
    });

    test('handleOnBlur should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(DUMMY_EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.handleOnBlur(new Event('{}'));
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

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.handleOnBlur(new Event('{}'));
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('logout');
    });

    test('handleVisibilityChange should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(DUMMY_EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.handleVisibilityChange();
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });

    test('handleOnBeforeUnload should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(DUMMY_EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.handleOnBeforeUnload();
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });

    test('upsertSession should wait for login promise', async () => {
      const loginPromise = (async function () {
        await LoginManager.login(DUMMY_EXTERNAL_ID);
        return 'login';
      })();

      const sessionManager = new SessionManager(OneSignal.context);
      const sessionPromise = (async function () {
        await sessionManager.upsertSession(SessionOrigin.UserCreate);
        return 'session';
      })();

      const winner = await Promise.race([loginPromise, sessionPromise]);
      expect(winner).toBe('login');
    });
  });
});
