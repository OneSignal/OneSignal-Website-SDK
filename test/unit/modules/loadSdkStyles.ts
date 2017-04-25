import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import Environment from "../../../src/Environment";
import SubscriptionHelper from "../../../src/helpers/SubscriptionHelper";
import * as sinon from 'sinon';
import Bell from "../../../src/bell/Bell";
import InitHelper from "../../../src/helpers/InitHelper";
import MainHelper from "../../../src/helpers/MainHelper";
import { InvalidStateError, InvalidStateReason } from "../../../src/errors/InvalidStateError";
import Launcher from "../../../src/bell/Launcher";
import MockDummy from "../../support/mocks/MockDummy";
import ActiveAnimatedElement from "../../../src/bell/ActiveAnimatedElement";
import AnimatedElement from "../../../src/bell/AnimatedElement";
import MockLauncher from "../../support/mocks/MockLauncher";
import { DynamicResourceLoader } from "../../../src/services/DynamicResourceLoader";

test.beforeEach(t => {
  t.context.loadSdkStylesheet = sinon.stub(DynamicResourceLoader.prototype, 'loadSdkStylesheet');
});

test.afterEach.always(t => {
  t.context.loadSdkStylesheet.restore();
});

test("should load if notify button is used", async t => {
  await TestEnvironment.initialize({
    initOptions: {
      notifyButton: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  const notifyButton = new Bell({
    enable: true,
    launcher: new MockLauncher(null)
  });
  notifyButton.launcher.bell = notifyButton;
  debugger;
  await notifyButton.create();
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("should load if HTTP permission request is used", async t => {
  await TestEnvironment.initialize({
    initOptions: {
      httpPermissionRequest: {
        enable: true
      }
    },
    httpOrHttps: HttpHttpsEnvironment.Http
  });
  await MainHelper.showHttpPermissionRequestPostModal();
  t.is(t.context.loadSdkStylesheet.called, true);
});

test("should load if slidedown permission message is used", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  try {
    await OneSignal.showHttpPrompt();
  } catch (e) {
    if (e instanceof InvalidStateError && e.reason === InvalidStateReason.MissingAppId) {
    } else throw e;
  }
  t.is(t.context.loadSdkStylesheet.called, true);
});