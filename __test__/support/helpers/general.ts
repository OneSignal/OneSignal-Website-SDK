import { vi } from 'vite-plus/test';
/**
 * DON'T use with vi.useFakeTimers()
 * Flushes promises within some window
 */
export function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, sv] of Object.entries(source)) {
    const tv = result[key];
    if (isPlainObject(tv) && isPlainObject(sv)) {
      result[key] = deepMergeRecords(tv, sv);
    } else if (Array.isArray(tv) && Array.isArray(sv)) {
      result[key] = [...tv, ...sv];
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/** Recursively merges source into target. Plain objects merge, arrays concat, primitives overwrite. */
export function deepMerge<T extends object>(target: DeepPartial<T>, source: DeepPartial<T>): T {
  if (isPlainObject(target) && isPlainObject(source)) {
    return deepMergeRecords(target, source) as T;
  }
  return (isPlainObject(source) ? source : target) as T;
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
