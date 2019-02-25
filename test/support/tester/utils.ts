export function isNullOrUndefined<T>(value: T | null | undefined): boolean {
  return typeof value === 'undefined' || value === null;
}


export function stubMessageChannel(t: TestContext) {
  // Stub MessageChannel
  const fakeClass = class Test { };
  t.context.originalMessageChannel = (global as any).MessageChannel;
  (global as any).MessageChannel = fakeClass;
}
