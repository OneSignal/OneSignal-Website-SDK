let getOneSignalApiUrl: typeof import('src/shared/helpers/environment').getOneSignalApiUrl;

const resetModules = async () => {
  vi.resetModules();
  getOneSignalApiUrl = (await import('src/shared/helpers/environment'))
    .getOneSignalApiUrl;
};

describe('Environment Helper', () => {
  test('can get api url ', async () => {
    // staging
    global.__API_TYPE__ = 'staging';
    global.__API_ORIGIN__ = 'onesignal-staging.com';
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe(
      'https://onesignal-staging.com/api/v1/',
    );

    // development -  turbine endpoint
    global.__API_ORIGIN__ = 'localhost';
    global.__API_TYPE__ = 'development';
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
    global.__API_TYPE__ = 'production';
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
