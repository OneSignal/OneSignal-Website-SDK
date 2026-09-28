// separate test file to avoid side effects from pageSdkInit.test.ts
import { APP_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import LoginManager from 'src/page/managers/LoginManager';
import { setConsentGiven } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

describe('pageSdkInit 4', () => {
  // Puts the SDK back to the state before init created the user model.
  beforeEach(() => {
    TestEnvironment.initialize();
    // @ts-expect-error - _coreDirector is unset before init
    OneSignal._coreDirector = undefined;
    OneSignal._consentGiven = false;
    OneSignal._coreReady = new Promise<void>((resolve) => {
      OneSignal._settleCoreReady = resolve;
    });
  });

  test('a login ahead of init in OneSignalDeferred fails, and init still runs', async () => {
    const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => '');
    const loginSpy = vi.spyOn(LoginManager, 'login').mockResolvedValue(undefined);
    // Consent was given on an earlier visit. Init loads it before it settles _coreReady.
    setConsentGiven(true);

    window.OneSignalDeferred = [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.login('jd-0');
    });
    let loginDuringInit: Promise<void> | undefined;
    const initDone = new Promise<void>((resolve) => {
      window.OneSignalDeferred!.push(async function (OneSignal) {
        const init = OneSignal.init({ appId: APP_ID, requiresUserPrivacyConsent: true });
        loginDuringInit = OneSignal.login('jd-1');
        await init;
        resolve();
      });
    });
    await import('./pageSdkInit');
    await initDone;
    await loginDuringInit;

    expect(errorSpy).toHaveBeenCalledWith(new Error("Must call 'init' before 'login'"));
    expect(window.OneSignal._coreDirector).toBeDefined();
    expect(loginSpy).toHaveBeenCalledExactlyOnceWith('jd-1', undefined);
  });
});
