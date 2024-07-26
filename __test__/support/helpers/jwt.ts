export function expectJwtToBeSent() {
  jest.mocked(window.fetch).mock.calls.forEach((params) => {
    expect(typeof params[0]).toBe('string');

    const requestInit = params[1] as RequestInit;
    const headers = requestInit.headers as Headers;

    expect(headers.get('Authorization')).toMatch(
      new RegExp(/^Bearer .*\..*\..*$/),
    );
  });
}

export function expectJwtToNotBeSent() {
  jest.mocked(window.fetch).mock.calls.forEach((params) => {
    expect(typeof params[0]).toBe('string');

    const requestInit = params[1] as RequestInit;
    const headers = requestInit.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });
}
