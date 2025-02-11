export function flushPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

export function delay(timeout = 100) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

export const nock = (responseBody: any, status = 200) =>
  vi.spyOn(global, 'fetch').mockResolvedValue({
    status,
    json: vi.fn().mockResolvedValue(responseBody),
  });

export const stub = (obj: any, method: string, returnValue?: any) => {
  const stub = vi.spyOn(obj, method);
  stub.mockReturnValue(returnValue);
  return stub;
};
