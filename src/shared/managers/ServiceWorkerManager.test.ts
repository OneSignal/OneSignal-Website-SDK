import { EXTERNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import * as detect from 'src/shared/environment/detect';
import * as helpers from 'src/shared/helpers/service-worker';
import {
  type JwtUnauthorizedPayload,
  WorkerMessengerCommand,
} from 'src/shared/libraries/workerMessenger/constants';
import Path from 'src/shared/models/Path';
import * as registration from 'src/sw/helpers/registration';
import { beforeEach, describe, expect, test, vi, type MockInstance } from 'vite-plus/test';

import Log from '../libraries/Log';
import { ServiceWorkerManager } from './ServiceWorkerManager';

describe('ServiceWorkerManager', () => {
  const config = {
    workerPath: new Path('/OneSignalSDKWorker.js'),
    registrationOptions: { scope: '/' },
  } as const;

  let getSWRegistrationSpy: MockInstance;
  beforeEach(() => {
    TestEnvironment.initialize();
    vi.restoreAllMocks();
    getSWRegistrationSpy = vi.spyOn(registration, 'getSWRegistration');
  });

  test('_getActiveState returns None when no registration', async () => {
    getSWRegistrationSpy.mockResolvedValue(undefined);
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    await expect(mgr._getActiveState()).resolves.toBe(helpers.ServiceWorkerActiveState._None);
  });

  test('_getActiveState detects OneSignal vs third-party from file name', async () => {
    const fakeReg = {} as ServiceWorkerRegistration;
    getSWRegistrationSpy.mockResolvedValue(fakeReg);
    const sw = (url: string): ServiceWorker =>
      ({
        scriptURL: url,
        state: 'activated',
        onstatechange: null,
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as ServiceWorker;
    const swSpy = vi.spyOn(registration, 'getAvailableServiceWorker');
    swSpy.mockReturnValue(sw(new URL('https://example.com/OneSignalSDKWorker.js').toString()));
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._OneSignalWorker,
    );

    // third-party
    swSpy.mockReturnValue(sw(new URL('https://example.com/othersw.js').toString()));
    await expect(mgr._getActiveState()).resolves.toBe(helpers.ServiceWorkerActiveState._ThirdParty);
  });

  test('_haveParamsChanged covers no registration, scope diff, missing scriptURL, href diff and same', async () => {
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    // no registration
    vi.spyOn(mgr, '_getRegistration').mockResolvedValue(undefined);
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(true);

    // registration with different scope
    const regWithScope = {
      scope: 'https://example.com/oldPath',
    } as ServiceWorkerRegistration;
    vi.spyOn(mgr, '_getRegistration').mockResolvedValue(regWithScope);
    const infoSpy = vi.spyOn(Log, '_info').mockImplementation(() => undefined);
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(true);
    expect(infoSpy).toHaveBeenCalled();

    // same scope but no worker scriptURL
    vi.spyOn(mgr, '_getRegistration').mockResolvedValue({
      scope: 'https://example.com/',
    } as ServiceWorkerRegistration);
    vi.spyOn(registration, 'getAvailableServiceWorker').mockReturnValue(null);
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(true);

    // different href
    vi.mocked(registration.getAvailableServiceWorker).mockReturnValue({
      scriptURL: 'https://example.com/old.js',
    } as ServiceWorker);
    vi.spyOn(helpers, 'getServiceWorkerHref').mockReturnValue('https://example.com/new.js');
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(true);

    // same href
    vi.mocked(helpers.getServiceWorkerHref).mockReturnValue('https://example.com/old.js');
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(false);
  });

  test('_shouldInstallWorker branches', async () => {
    const mgr = new ServiceWorkerManager(OneSignal._context, config);

    const supportsSpy = vi.spyOn(detect, 'supportsServiceWorkers').mockReturnValue(false);
    await expect(mgr['_shouldInstallWorker']()).resolves.toBe(false);

    supportsSpy.mockReturnValue(true);
    const savedConfig = OneSignal.config;
    OneSignal.config = null;
    await expect(mgr['_shouldInstallWorker']()).resolves.toBe(false);
    OneSignal.config = savedConfig;

    vi.spyOn(mgr, '_getActiveState').mockResolvedValue(helpers.ServiceWorkerActiveState._None);
    vi.spyOn(OneSignal._context._permissionManager, '_getNotificationPermission').mockReturnValue(
      'granted',
    );
    await expect(mgr['_shouldInstallWorker']()).resolves.toBe(true);

    vi.spyOn(mgr, '_getActiveState').mockResolvedValue(
      helpers.ServiceWorkerActiveState._OneSignalWorker,
    );
    vi.spyOn(mgr, '_haveParamsChanged').mockResolvedValue(true);
    await expect(mgr['_shouldInstallWorker']()).resolves.toBe(true);

    vi.spyOn(mgr, '_haveParamsChanged').mockResolvedValue(false);
    vi.spyOn(mgr, '_workerNeedsUpdate' as keyof ServiceWorkerManager).mockResolvedValue(false);
    await expect(mgr['_shouldInstallWorker']()).resolves.toBe(false);
  });

  describe('a worker 401 message', () => {
    const JWT = 'header.payload.signature';

    const receiveFromWorker = (payload: JwtUnauthorizedPayload) =>
      OneSignal._context._workerMessenger._onPageMessageReceivedFromServiceWorker(
        new MessageEvent('message', {
          data: { command: WorkerMessengerCommand._JwtUnauthorized, payload },
        }),
      );

    beforeEach(() => {
      localStorage.clear();
      new ServiceWorkerManager(OneSignal._context, config)._establishServiceWorkerChannel();
    });

    test('removes the rejected token and fires userJwtInvalidated once', async () => {
      const store = OneSignal._coreDirector._jwtTokenStore;
      store._putJwt(EXTERNAL_ID, JWT);
      const listener = vi.fn();
      OneSignal.User.addEventListener('userJwtInvalidated', listener);
      const debugSpy = vi.spyOn(Log, '_debug').mockImplementation(() => {});

      receiveFromWorker({ externalId: EXTERNAL_ID, jwt: JWT });
      // The same rejection reported again, for example from a second worker request.
      receiveFromWorker({ externalId: EXTERNAL_ID, jwt: JWT });
      await Promise.resolve();

      expect(store._getJwt(EXTERNAL_ID)).toBeUndefined();
      expect(listener).toHaveBeenCalledExactlyOnceWith({ externalId: EXTERNAL_ID });
      expect(debugSpy).toHaveBeenCalledWith(
        '[WM] Page received:',
        expect.objectContaining({ payload: expect.objectContaining({ jwt: '[redacted]' }) }),
      );
      expect(JSON.stringify(debugSpy.mock.calls)).not.toContain(JWT);
    });

    test('keeps a newer stored token and fires nothing', async () => {
      const store = OneSignal._coreDirector._jwtTokenStore;
      store._putJwt(EXTERNAL_ID, 'fresh-jwt');
      const listener = vi.fn();
      OneSignal.User.addEventListener('userJwtInvalidated', listener);

      receiveFromWorker({ externalId: EXTERNAL_ID, jwt: JWT });
      await Promise.resolve();

      expect(store._getJwt(EXTERNAL_ID)).toBe('fresh-jwt');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
