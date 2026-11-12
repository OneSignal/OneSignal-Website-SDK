/** jsdom has no Web Locks. Callbacks for the same name run one at a time. */
export function createFakeLocks(): Pick<LockManager, 'request'> {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request: ((name: string, callback: () => Promise<unknown>) => {
      const run = (tails.get(name) ?? Promise.resolve()).then(() => callback());
      tails.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    }) as LockManager['request'],
  };
}
