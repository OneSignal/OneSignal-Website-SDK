import Log from '../../shared/libraries/Log';

export interface CancelableTimeoutPromise {
  cancel: () => void;
  promise: Promise<void>;
}

export function cancelableTimeout(
  callback: () => Promise<void>,
  delayInSeconds: number,
): CancelableTimeoutPromise {
  const delayInMilliseconds = delayInSeconds * 1000;

  let timerId: number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let clearTimeoutHandle = () => {};

  const promise = new Promise<void>((resolve, reject) => {
    let startedExecution = false;

    timerId = self.setTimeout(async () => {
      startedExecution = true;
      try {
        await callback();
        resolve();
      } catch (e) {
        Log.error('Failed to execute callback', e);
        reject();
      }
    }, delayInMilliseconds);

    clearTimeoutHandle = () => {
      Log.debug('Cancel called');
      self.clearTimeout(timerId);
      if (!startedExecution) {
        resolve();
      }
    };
  });

  return {
    promise,
    cancel: clearTimeoutHandle,
  };
}
