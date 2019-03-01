// Definition pulled from lib.es2015.promise.d.ts
type PromiseExecutor<T> = (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void;

// Stub used for browsers that don't have Promises or it isn't pollyfilled
// Can't simply extend from Promise as built ES5 will still try to reference the class.
export class PromiseStub<T> implements Promise<T> {
  readonly [Symbol.toStringTag]: "Promise";

  private readonly executor: PromiseExecutor<T>;

  constructor(_executor: PromiseExecutor<T>) {
    this.executor = _executor;
  }

  catch<TResult = never>(_onrejected?: ((reason: any) => (PromiseLike<TResult> | TResult)) | undefined | null): Promise<T | TResult> {
    return this;
  }

  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => (PromiseLike<TResult1> | TResult1)) | undefined | null, onrejected?: ((reason: any) => (PromiseLike<TResult2> | TResult2)) | undefined | null): Promise<TResult1 | TResult2> {
    this.executor(function(value: any) {
        if (onfulfilled)
          onfulfilled(value);
      }, function(reason: any) {
        if (onrejected)
          onrejected(reason);
      });
    // TODO: Should handle throw an call onrejected
    return <PromiseStub<any>>this;
  }

  // From lib.es2018.promise.d.ts
  finally(_onfinally?: (() => void) | undefined | null): Promise<T> {
    return this;
  }
}

export class PromiseFactory {
  // Will create a new Promise if the browser has it defined, otherwise fallback to a PromiseStub
  public static newPromise<T>(executor: PromiseExecutor<T>): Promise<T> {
    const isPromiseDefined = (typeof(Promise) !== "undefined");
    return isPromiseDefined ? new Promise<T>(executor) : new PromiseStub<T>(executor);
  }
}
