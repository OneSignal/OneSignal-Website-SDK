import { DelayedPromptType } from '../../shared/models/Prompts';
import OneSignalError from '../../shared/errors/OneSignalError';

export default class ExistingChannelError extends OneSignalError {
  constructor(type: DelayedPromptType) {
    super(`This operation can only be performed when the channel '${type}' does not yet exist.`);

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#
     * extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, ExistingChannelError.prototype);
  }
}
