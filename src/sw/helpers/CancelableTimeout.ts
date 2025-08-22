import log from '../../shared/helpers/log';
import { LogMessage } from '../../shared/helpers/log/constants';

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
        log(LogMessage.CancelableTimeoutCallbackError, {
          error: e,
        });
        reject();
      }
    }, delayInMilliseconds);

    clearTimeoutHandle = () => {
      log(LogMessage.CancelableTimeoutCancel);
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
