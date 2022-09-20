import { InvalidArgumentError, InvalidArgumentReason } from "../../errors/InvalidArgumentError";
import Log from "../../libraries/Log";

export class AuthHashOptionsValidatorHelper {

  static VALID_AUTH_HASH_LENGTH = 64;

  // Ensure that if the provided options object exists and has any keys that exist in the provided
  //   array that they are a length of VALID_AUTH_HASH_LENGTH. null and undefined do not throw.
  static throwIfInvalidAuthHashOptions(options: any, keys: Array<string>): string | undefined {
    if (!options) {
      return undefined;
    }

    const validKeys = keys.filter(key => options.hasOwnProperty(key));
    if (validKeys.length > 1) {
      Log.error("More than one key provided, please only provide one!", validKeys);
      throw new InvalidArgumentError('options', InvalidArgumentReason.Malformed);
    }

    // Grab first key as we throw above if we have more than one.
    const keyName = validKeys[0];
    const hashToCheck = options[keyName];

    // null / undefined is ok.
    if (!hashToCheck) {
      return undefined;
    }

    AuthHashOptionsValidatorHelper.throwIfInvalidAuthHash(hashToCheck, `options.${keyName}`);

    return hashToCheck;
  }

  // Throw if provide value if not exactly VALID_AUTH_HASH_LENGTH in length, if it isn't falsy.
  static throwIfInvalidAuthHash(value: string | undefined | null, fieldName: string): void {
    if (!value) {
      return;
    }

    if (value.length !== AuthHashOptionsValidatorHelper.VALID_AUTH_HASH_LENGTH) {
      throw new InvalidArgumentError(fieldName, InvalidArgumentReason.Malformed);
    }
  }
}
