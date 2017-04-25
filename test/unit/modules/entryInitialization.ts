import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { Notification } from "../../../src/models/Notification";
import * as sinon from "sinon";


test.todo("should initialize a global instance in Service Worker environment");

test.todo("should initialize a global instance in browser DOM environment");

test.todo("should execute OneSignal functions that were queued before SDK initialization");

test.todo("should initialize a phantom stub in an unsupported environment");