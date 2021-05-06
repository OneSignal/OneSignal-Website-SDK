import '../../support/polyfills/polyfills';
import test from 'ava';
import OneSignalError from "../../../src/errors/OneSignalError";
import { throws } from "../../support/tester/asyncFunctions";


test(`custom error thrown from sync function`, async t => {
  t.throws(() => {
    throw new OneSignalError('my message');
  }, { instanceOf: OneSignalError });
});

test(`custom error thrown from down-emitted "async" function`, async t => {
  /*
    Because async functions are implemented only in ES7, and because the JS ecosystem is mostly just catching up to
    ES6, async/await is transpiled to generator functions, which are actually functions, and not promises.

    t.throws() would work on async functions if only they returned promises. But ES5 transpilation (even ES6
    transpilation) changes the method return type from a Promise to a function.

    https://gist.github.com/jasonpang/ae41a814e99f21238c302bf2a4da0df5
   */
  await throws(t, async () => { throw new OneSignalError('my message'); }, OneSignalError);
});