export function flushPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

/**
 * @deprecated This is a hacky approach to mock network requests. Use msw instead.
 */
export const nock = (responseBody: any, status = 200) =>
  // @ts-expect-error - simple mock for mocking fetch responses, avoid using
  vi.spyOn(global, 'fetch').mockResolvedValue({
    status,
    json: vi.fn().mockResolvedValue(responseBody),
  });

/**
 * @deprecated Use vi.spyOn instead
 */
export const stub = (obj: any, method: string, returnValue?: any) => {
  const stub = vi.spyOn(obj, method);
  stub.mockReturnValue(returnValue);
  return stub;
};
