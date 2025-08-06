let getOneSignalApiUrl: typeof import('src/shared/environment/detect').getOneSignalApiUrl;

const resetModules = async () => {
  vi.resetModules();
  getOneSignalApiUrl = (await import('src/shared/environment/detect'))
    .getOneSignalApiUrl;
};

describe('Environment Helper', () => {
  test('can get api url ', async () => {
    // staging
    (global as any).__API_TYPE__ = 'staging';
    (global as any).__API_ORIGIN__ = 'onesignal-staging.com';
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe(
      'https://onesignal-staging.com/api/v1/',
    );

    // development -  turbine endpoint
    (global as any).__API_ORIGIN__ = 'localhost';
    (global as any).__API_TYPE__ = 'development';
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe(
      'http://localhost:3000/api/v1/',
    );
    expect(
      getOneSignalApiUrl({
        action: 'outcomes',
      }).toString(),
    ).toBe('http://localhost:18080/api/v1/');

    // production
    (global as any).__API_TYPE__ = 'production';
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe('https://api.onesignal.com/');

    // production - legacy
    expect(
      getOneSignalApiUrl({
        legacy: true,
      }).toString(),
    ).toBe('https://onesignal.com/api/v1/');
  });
});
