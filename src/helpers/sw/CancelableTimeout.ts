import SWLog from "../../libraries/SWLog";

export interface CancelableTimeoutPromise {
  cancel: () => void;
  promise: Promise<void>;
}

const doNothing = () => {
  SWLog.debug("Do nothing");
};

export function cancelableTimeout(callback: () => Promise<void>, delayInSeconds: number): CancelableTimeoutPromise {
  const delayInMilliseconds = delayInSeconds * 1000;

  let timerId: number | undefined;
  let clearTimeoutHandle: (() => void) | undefined = undefined;

  const promise = new Promise<void>((resolve, reject) => {
    let startedExecution: boolean = false;

    timerId = self.setTimeout(
      async () => {
        startedExecution = true;
        try {
          await callback();
          resolve();
        } catch(e) {
          SWLog.error("Failed to execute callback", e);
          reject();
        }
      },
      delayInMilliseconds);

    clearTimeoutHandle = () => {
      SWLog.debug("Cancel called");
      self.clearTimeout(timerId);
      if (!startedExecution) {
        resolve();
      }
    };
  });

  if (!clearTimeoutHandle) {
    SWLog.warn("clearTimeoutHandle was not assigned.");
    return {
      promise,
      cancel: doNothing,
    };
  }

  return {
    promise,
    cancel: clearTimeoutHandle,
  };
}
