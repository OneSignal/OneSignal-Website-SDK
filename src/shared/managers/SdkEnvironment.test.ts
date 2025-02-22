// @vitest-environment node
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { EnvironmentKind } from '../models/EnvironmentKind';
import SdkEnvironment from './SdkEnvironment';

describe('SdkEnvironment', () => {
  test('can determine window environment', () => {
    // @ts-expect-error - mock self to test host environment
    global.self = {};
    // @ts-expect-error - mock window to test host environment
    global.window = {};
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

  test('can get api url ', () => {
    expect(SdkEnvironment.getOneSignalApiUrl().toString()).toBe(
      'https://onesignal.com/api/v1',
    );

    // development -  turbine endpoint
    expect(
      SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Development).toString(),
    ).toBe('http://localhost:3000/api/v1');
    expect(
      SdkEnvironment.getOneSignalApiUrl(
        EnvironmentKind.Development,
        'outcomes',
      ).toString(),
    ).toBe('http://localhost:18080/api/v1');

    // staging
    expect(
      SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Staging).toString(),
    ).toBe('https://localhost/api/v1');

    // -- with custom origin
    // @ts-expect-error - mock __API_ORIGIN__ to test custom origin
    global.__API_ORIGIN__ = 'some-origin';
    expect(
      SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Staging).toString(),
    ).toBe('https://some-origin/api/v1');

    // production
    expect(
      SdkEnvironment.getOneSignalApiUrl(EnvironmentKind.Production).toString(),
    ).toBe('https://onesignal.com/api/v1');
  });
});
