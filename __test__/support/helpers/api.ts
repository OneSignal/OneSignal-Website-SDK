export function isAsyncFunction(fn: () => any): boolean {
  const fnStr = fn.toString().trim();
  return !!(
    fnStr.startsWith('async ') ||
    fnStr.includes('await') ||
    fn instanceof Promise
  );
}
