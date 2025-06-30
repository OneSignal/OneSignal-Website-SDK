// @vitest-environment node
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';

const apiType: string = global.__API_TYPE__;
const apiOrigin: string = global.__API_ORIGIN__;
afterEach(() => {
  global.__API_TYPE__ = apiType;
  global.__API_ORIGIN__ = apiOrigin;
});

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
    let SdkEnvironment = await getSdkEnvironment();
    expect(SdkEnvironment.getOneSignalApiUrl().toString()).toBe(
      'https://onesignal-staging.com/api/v1/',
    );

    // development -  turbine endpoint
    global.__API_ORIGIN__ = 'localhost';
    SdkEnvironment = await getSdkEnvironment();
    expect(
      SdkEnvironment.getOneSignalApiUrl({
        action: 'outcomes',
      }).toString(),
    ).toBe('http://localhost:18080/api/v1/');

    // -- with custom origin
    // @ts-expect-error - mock __API_ORIGIN__ to test custom origin
    global.__API_ORIGIN__ = 'some-origin';
    SdkEnvironment = await getSdkEnvironment();
    expect(
      SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Staging).toString(),
    ).toBe('https://some-origin/api/v1');

    // production
    global.__BUILD_TYPE__ = 'production';
    expect(SdkEnvironment.getOneSignalApiUrl().toString()).toBe(
      'https://api.onesignal.com/',
    );

    // production - legacy
    global.__BUILD_TYPE__ = 'production';
    expect(
      SdkEnvironment.getOneSignalApiUrl({
        legacy: true,
      }).toString(),
    ).toBe('https://onesignal.com/api/v1/');
  });
});
