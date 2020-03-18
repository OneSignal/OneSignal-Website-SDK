import Log from "../../libraries/Log";

export interface CancelableTimeoutPromise {
  cancel: () => void;
  promise: Promise<void>;
}

const doNothing = () => {
  Log.debug("Do nothing");
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
          Log.error("Failed to execute callback", e);
          reject();
        }
      }, 
      delayInMilliseconds);
    
    clearTimeoutHandle = () => {
      Log.debug("Cancel called");
      self.clearTimeout(timerId); 
      if (!startedExecution) {
        reject();
      }
    }
  });

  if (!clearTimeoutHandle) {
    Log.warn("clearTimeoutHandle was not assigned.");
    return {
      promise,
      cancel: doNothing,
    }
  }

  return {
    promise,
    cancel: clearTimeoutHandle,
  }
}
