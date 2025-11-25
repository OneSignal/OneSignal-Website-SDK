import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import * as detect from 'src/shared/environment/detect';
import * as helpers from 'src/shared/helpers/service-worker';
import Path from 'src/shared/models/Path';
import { VERSION } from 'src/shared/utils/env';
import * as registration from 'src/sw/helpers/registration';
import { vi } from 'vitest';
import Log from '../libraries/Log';
import { ServiceWorkerManager } from './ServiceWorkerManager';

describe('ServiceWorkerManager', () => {
  const config = {
    workerPath: new Path('/OneSignalSDKWorker.js'),
    registrationOptions: { scope: '/' },
  } as const;

  beforeEach(() => {
    TestEnvironment.initialize();
    vi.restoreAllMocks();
  });

  test('_getActiveState returns None when no registration', async () => {
    vi.spyOn(registration, 'getSWRegistration').mockResolvedValue(
      undefined as any,
    );
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._None,
    );
  });

  test('_getActiveState detects OneSignal vs third-party from file name', async () => {
    const fakeReg = {} as ServiceWorkerRegistration;
    vi.spyOn(registration, 'getSWRegistration').mockResolvedValue(fakeReg);
    vi.spyOn(registration, 'getAvailableServiceWorker').mockReturnValue({
      scriptURL: new URL(
        'https://example.com/OneSignalSDKWorker.js',
      ).toString(),
    });
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._OneSignalWorker,
    );

    // third-party
    registration.getAvailableServiceWorker.mockReturnValue({
      scriptURL: new URL('https://example.com/othersw.js').toString(),
    });
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._ThirdParty,
    );
  });

  test('_haveParamsChanged covers no registration, scope diff, missing scriptURL, href diff and same', async () => {
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    // no registration
    vi.spyOn(mgr, '_getRegistration').mockResolvedValue(undefined);
    await expect(mgr._haveParamsChanged()).resolves.toBe(true);

    // registration with different scope
    const regWithScope = {
      scope: 'https://example.com/oldPath',
    } as ServiceWorkerRegistration;
    mgr._getRegistration.mockResolvedValue(regWithScope);
    const infoSpy = vi.spyOn(Log, '_info').mockImplementation(() => undefined);
    await expect(mgr._haveParamsChanged()).resolves.toBe(true);
    expect(infoSpy).toHaveBeenCalled();

    // same scope but no worker scriptURL
    mgr._getRegistration.mockResolvedValue({ scope: 'https://example.com/' });
    vi.spyOn(registration, 'getAvailableServiceWorker').mockReturnValue(
      undefined,
    );
    await expect(mgr._haveParamsChanged()).resolves.toBe(true);

    // different href
    registration.getAvailableServiceWorker.mockReturnValue({
      scriptURL: 'https://example.com/old.js',
    });
    vi.spyOn(helpers, 'getServiceWorkerHref').mockReturnValue(
      'https://example.com/new.js',
    );
    await expect(mgr._haveParamsChanged()).resolves.toBe(true);

    // same href
    (
      helpers.getServiceWorkerHref as unknown as import('vitest').SpyInstance
    ).mockReturnValue('https://example.com/old.js');
    await expect(mgr._haveParamsChanged()).resolves.toBe(false);
  });

  test('_shouldInstallWorker branches', async () => {
    const mgr = new ServiceWorkerManager(OneSignal._context, config);

    vi.spyOn(detect, 'supportsServiceWorkers').mockReturnValue(false);
    await expect(mgr._shouldInstallWorker()).resolves.toBe(false);

    detect.supportsServiceWorkers.mockReturnValue(true);
    const savedConfig = OneSignal.config;
    OneSignal.config = undefined;
    await expect(mgr._shouldInstallWorker()).resolves.toBe(false);
    OneSignal.config = savedConfig;

    vi.spyOn(mgr, '_getActiveState').mockResolvedValue(
      helpers.ServiceWorkerActiveState._None,
    );
    vi.spyOn(
      OneSignal._context._permissionManager,
      '_getNotificationPermission',
    ).mockResolvedValue('granted');
    await expect(mgr._shouldInstallWorker()).resolves.toBe(true);

    mgr._getActiveState.mockResolvedValue(
      helpers.ServiceWorkerActiveState._OneSignalWorker,
    );
    vi.spyOn(mgr, '_haveParamsChanged').mockResolvedValue(true);
    await expect(mgr._shouldInstallWorker()).resolves.toBe(true);

    mgr._haveParamsChanged.mockResolvedValue(false);
    vi.spyOn(mgr, '_workerNeedsUpdate').mockResolvedValue(false);
    await expect(mgr._shouldInstallWorker()).resolves.toBe(false);
  });

  test('_workerNeedsUpdate compares versions', async () => {
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    vi.spyOn(mgr, '_getWorkerVersion').mockResolvedValue('0.0.1');
    await expect(mgr._workerNeedsUpdate()).resolves.toBe(true);
    mgr._getWorkerVersion.mockResolvedValue(VERSION);
    await expect(mgr._workerNeedsUpdate()).resolves.toBe(false);
  });
});
