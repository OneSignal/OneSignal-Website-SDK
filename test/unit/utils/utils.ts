import '../../support/polyfills/polyfills';
import test from "ava";
import { timeoutPromise } from "../../../src/utils";
import TimeoutError from '../../../src/errors/TimeoutError';


test(`timeoutPromise should reject after the specified amount of time`, async t => {
  try {
    await timeoutPromise(new Promise(() => {
      /* Never resolve */
    }), 15 /* Timeout immediately for test */);
    t.fail("Asynchronous block that was awaited on should not have continued");
  } catch (e) {
    if (e instanceof TimeoutError) {
      t.pass("Promise successfully timed out and rejected as expected.");
    } else {
      t.fail("Caught an error, but was not the expected kind of error:" + e.toString());
    }
  }
});

test(`timeoutPromise should resolve target promise if its faster`, async t => {
  try {
    await timeoutPromise(new Promise<void>(resolve => {
      resolve();
    }), 15 /* Timeout immediately for test */);
    t.pass("Target promise successfully execited.");
  } catch (e) {
    t.fail("No error should have been raised.");
  }
});
