import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";


test.todo("should reject empty payload");

test.todo("should reject well-formed but non-OneSignal payload");

test.todo("should accept valid OneSignal payload");