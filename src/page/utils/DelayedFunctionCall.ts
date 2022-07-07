interface DelayedPromise<T> {
  // These are from executor in PromiseConstructor from lib.es2015.promise.d.ts
  resolve: (value?: T | PromiseLike<T>) => void | undefined;
  reject: (reason?: any) => void | undefined;
}

interface DelayedFunctionCall<T> {
  functionName: string;
  delayedPromise: DelayedPromise<T> | undefined;
  args: any[];
}
