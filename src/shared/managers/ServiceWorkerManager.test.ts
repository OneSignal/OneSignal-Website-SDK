import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import * as detect from 'src/shared/environment/detect';
import * as helpers from 'src/shared/helpers/service-worker';
import Path from 'src/shared/models/Path';
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
    vi.spyOn(registration, 'getSWRegistration').mockResolvedValue(undefined);
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._None,
    );
  });

  test('_getActiveState detects OneSignal vs third-party from file name', async () => {
    const fakeReg = {} as ServiceWorkerRegistration;
    vi.spyOn(registration, 'getSWRegistration').mockResolvedValue(fakeReg);
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
    swSpy.mockReturnValue(
      sw(new URL('https://example.com/OneSignalSDKWorker.js').toString()),
    );
    const mgr = new ServiceWorkerManager(OneSignal._context, config);
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._OneSignalWorker,
    );

    // third-party
    swSpy.mockReturnValue(
      sw(new URL('https://example.com/othersw.js').toString()),
    );
    await expect(mgr._getActiveState()).resolves.toBe(
      helpers.ServiceWorkerActiveState._ThirdParty,
    );
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
    vi.spyOn(helpers, 'getServiceWorkerHref').mockReturnValue(
      'https://example.com/new.js',
    );
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(true);

    // same href
    vi.mocked(helpers.getServiceWorkerHref).mockReturnValue(
      'https://example.com/old.js',
    );
    await expect(mgr['_haveParamsChanged']()).resolves.toBe(false);
  });

  test('_shouldInstallWorker branches', async () => {
    const mgr = new ServiceWorkerManager(OneSignal._context, config);

    const supportsSpy = vi
      .spyOn(detect, 'supportsServiceWorkers')
      .mockReturnValue(false);
    await expect(
      (
        mgr as unknown as { _shouldInstallWorker: () => Promise<boolean> }
      )._shouldInstallWorker(),
    ).resolves.toBe(false);

    supportsSpy.mockReturnValue(true);
    const savedConfig = OneSignal.config;
    OneSignal.config = null as any;
    await expect(
      (
        mgr as unknown as { _shouldInstallWorker: () => Promise<boolean> }
      )._shouldInstallWorker(),
    ).resolves.toBe(false);
    OneSignal.config = savedConfig;

    vi.spyOn(mgr, '_getActiveState').mockResolvedValue(
      helpers.ServiceWorkerActiveState._None,
    );
    vi.spyOn(
      OneSignal._context._permissionManager,
      '_getNotificationPermission',
    ).mockResolvedValue('granted');
    await expect(
      (
        mgr as unknown as { _shouldInstallWorker: () => Promise<boolean> }
      )._shouldInstallWorker(),
    ).resolves.toBe(true);

    vi.spyOn(mgr, '_getActiveState').mockResolvedValue(
      helpers.ServiceWorkerActiveState._OneSignalWorker,
    );
    vi.spyOn(
      mgr as unknown as { _haveParamsChanged: () => Promise<boolean> },
      '_haveParamsChanged',
    ).mockResolvedValue(true);
    await expect(
      (
        mgr as unknown as { _shouldInstallWorker: () => Promise<boolean> }
      )._shouldInstallWorker(),
    ).resolves.toBe(true);

    vi.spyOn(
      mgr as unknown as { _haveParamsChanged: () => Promise<boolean> },
      '_haveParamsChanged',
    ).mockResolvedValue(false);
    vi.spyOn(
      mgr as unknown as { _workerNeedsUpdate: () => Promise<boolean> },
      '_workerNeedsUpdate',
    ).mockResolvedValue(false);
    await expect(
      (
        mgr as unknown as { _shouldInstallWorker: () => Promise<boolean> }
      )._shouldInstallWorker(),
    ).resolves.toBe(false);
  });

  // omit direct private _workerNeedsUpdate test
});
