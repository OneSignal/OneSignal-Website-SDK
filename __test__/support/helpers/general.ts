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
