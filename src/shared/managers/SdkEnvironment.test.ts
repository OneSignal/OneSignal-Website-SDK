// @vitest-environment node
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';

const getSdkEnvironment = async () => {
  vi.resetModules();
  const SdkEnvironment = await import('./SdkEnvironment');
  return SdkEnvironment.default;
};

describe('SdkEnvironment', () => {
  test('can determine window environment', async () => {
    // @ts-expect-error - mock self to test host environment
    global.self = {};
    // @ts-expect-error - mock window to test host environment
    global.window = {};

    const SdkEnvironment = await getSdkEnvironment();
    // @ts-check
    expect(SdkEnvironment.getWindowEnv()).toBe(WindowEnvironmentKind.Host);

    // @ts-expect-error - mock window to test host environment
    global.ServiceWorkerGlobalScope = {};
    expect(SdkEnvironment.getWindowEnv()).toBe(
      WindowEnvironmentKind.ServiceWorker,
    );

    delete global.ServiceWorkerGlobalScope;
    delete global.window;
    expect(() => SdkEnvironment.getWindowEnv()).toThrowError(
      'OneSignalSDK: Unsupported JS runtime!',
    );
  });

  test('can get api url ', async () => {
    // staging
    global.__API_TYPE__ = 'staging';
    global.__API_ORIGIN__ = 'onesignal-staging.com';
    let SdkEnvironment = await getSdkEnvironment();
    expect(SdkEnvironment.getOneSignalApiUrl().toString()).toBe(
      'https://onesignal-staging.com/api/v1/',
    );

    // development -  turbine endpoint
    global.__API_ORIGIN__ = 'localhost';
    global.__API_TYPE__ = 'development';
    SdkEnvironment = await getSdkEnvironment();
    expect(SdkEnvironment.getOneSignalApiUrl().toString()).toBe(
      'http://localhost:3000/api/v1/',
    );
    expect(
      SdkEnvironment.getOneSignalApiUrl({
        action: 'outcomes',
      }).toString(),
    ).toBe('http://localhost:18080/api/v1/');

    // production
    global.__API_TYPE__ = 'production';
    SdkEnvironment = await getSdkEnvironment();
    expect(SdkEnvironment.getOneSignalApiUrl().toString()).toBe(
      'https://api.onesignal.com/',
    );

    // production - legacy
    expect(
      SdkEnvironment.getOneSignalApiUrl({
        legacy: true,
      }).toString(),
    ).toBe('https://onesignal.com/api/v1/');
  });
});
