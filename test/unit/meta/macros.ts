import "../../support/polyfills/polyfills";
import test from "ava";
import {InvalidArgumentError, InvalidArgumentReason} from "../../../src/errors/InvalidArgumentError";
import Macros from "../../support/tester/Macros";


test("macro expectInvalidArgumentError", Macros.expectInvalidArgumentError, () => {
  throw new InvalidArgumentError("param", InvalidArgumentReason.Empty);
});
