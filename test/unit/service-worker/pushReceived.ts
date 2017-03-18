import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";


test.todo("should display backup notification, if no notifications found in payload or remote server fetch");

test.todo("should call self.registration.showNotification with all notification parameters");

test.todo("should update the backup notification");

test.todo("should broadcast notification.displayed to window clients");

test.todo("should execute notification.displayed webhook");