interface DelayedPromise {
  resolve: (value?: any | PromiseLike<any>) => void | undefined;
  reject: (reason?: any) => void | undefined;
}

interface DelayedFunctionCall {
  functionName: string;
  delayedPromise: DelayedPromise | undefined;
  args: any[];
}
