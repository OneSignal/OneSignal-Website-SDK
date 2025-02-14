export function flushPromises() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

/**
 * @deprecated This is a hacky approach to mock network requests. Use msw instead.
 */
export const nock = (responseBody: any, status = 200) =>
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

export function merge<T extends object, U extends object>(
  target: T,
  source: U,
): T & U {
  if (typeof target !== 'object' || target === null) {
    return source as T & U;
  }

  for (const key of Object.keys(source) as Array<keyof U>) {
    if (source[key] instanceof Object && target[key] instanceof Object) {
      target[key] = merge(target[key], source[key] as any);
    } else {
      target[key] = source[key] as any;
    }
  }

  return target as T & U;
}
