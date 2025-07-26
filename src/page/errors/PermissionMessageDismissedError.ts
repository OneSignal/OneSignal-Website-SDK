import OneSignalError from 'src/shared/errors/OneSignalError';
import type { DelayedPromptTypeValue } from 'src/shared/prompts';

export default class PermissionMessageDismissedError extends OneSignalError {
  constructor(type?: DelayedPromptTypeValue) {
    super(
      `The permission message of type ${
        type || 'unknown'
      } was previously dismissed.`,
    );

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, PermissionMessageDismissedError.prototype);
  }
}
