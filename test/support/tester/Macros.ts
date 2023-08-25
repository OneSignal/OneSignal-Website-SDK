import { InvalidArgumentError } from '../../../src/shared/errors/InvalidArgumentError';
import { throws, notThrows } from '../../support/tester/asyncFunctions';

/* See: https://github.com/avajs/ava#test-macros */
export default class Macros {
  static async expectInvalidArgumentError(t, action: Action<any>, ...args) {
    await throws(t, action.bind(null, args), InvalidArgumentError);
  }
  static async expectNoErrors(t, action: Action<any>, ...args) {
    await notThrows(t, action.bind(null, args));
  }
}
