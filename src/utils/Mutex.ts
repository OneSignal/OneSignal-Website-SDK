/**
 * The Mutex lock is a boolean semaphore.
 * If multiple callers try to get a lock, we must chain them together.
 *    e.g:
 *      We have caller 'A','B','C', and 'D', each with its own asynchronous operation.
 *      At the end of each operation, the function prints it's name (e.g: 'A')
 *      We call each function in alphabetical order.
 *
 *      Function A takes 10 ms.
 *      Function B takes 30 ms.
 *      Function C takes 5 ms.
 *      Function D takes 20 ms.
 *
 *      Using locks, the correct print order should still be 'A' -> 'B' -> 'C' -> 'D'.
 *
 *  Execution:
 *      Function A requests a lock, then B requests a lock, then C, then D -- each lock with its own "key" (or unlock).
 *      When A is locked, we will create a `lockPromise` that will be set to the `current` outstanding lock
 *      (a resolved promise).
 *
 *      At the same time, we will create an unlock mechanism `unlock` which can be called at any time after the
 *      asynchronous operation.
 *
 *      Then B is locked and the `current` outstanding lock gets set to B's lock. The same occurs with C and D.
 *
 *      When A's `unlock` is called, the `current` outstanding lock is D's lock, which is waiting on C's lock,
 *      which is waiting on B's lock, which is waiting on A's lock which is waiting on a resolved promise.
 *
 *      We are essentially chaining the promises together so that new promises that are generated from lock acquisitions
 *      must await on resolution of old promises.
 *        e.g:
 *          Lock    Unlock
 *          A       resolved promise  -> lockPromiseA'
 *          B       lockPromiseA      -> lockPromiseB'
 *          C       lockPromiseB      -> lockPromiseC'
 *
 *      Where ' indicates the `_resove` function for the lockPromise
 */

export default class Mutex {
  // initialize current to a fulfilled promise = unlocked mutex
  private current = Promise.resolve();

  lock(): Promise<Function> {
      let _resolve: Function;

      const lockPromise = new Promise<void>(resolve => {
        _resolve = () => {
          resolve();
        };
      });

      // Sets `unlock` to a promise that only resolves when the current outstanding lock resolves
      // We use closures here to "save off"
      const unlock = this.current.then(() => _resolve);

      // Don't allow the next request until the new promise is done
      this.current = lockPromise;

      // Return the unlocking mechanism
      return unlock;
  }
}
