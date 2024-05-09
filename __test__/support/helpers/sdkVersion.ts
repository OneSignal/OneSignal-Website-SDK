export function expectHeaderToBeSent() {
  jest.mocked(window.fetch).mock.calls.forEach((params) => {
    expect(typeof params[0]).toBe('string');

    const requestInit = params[1] as RequestInit;
    const headers = requestInit.headers as Headers;
    expect(headers.get('sdk-version')).toMatch(
      new RegExp(/^onesignal\/web\/[0-9]{6}$/),
    );
  });
}

export function expectOneSignalSubscriptionIdHeaderToBeSent() {
  jest.mocked(window.fetch).mock.calls.forEach((params) => {
    expect(typeof params[0]).toBe('string');

    const requestInit = params[1] as RequestInit;
    const headers = requestInit.headers as Headers;
    expect(headers.get('OneSignal-Subscription-Id')).toMatch(
      new RegExp(/^[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}$/),
    );
  });
}
