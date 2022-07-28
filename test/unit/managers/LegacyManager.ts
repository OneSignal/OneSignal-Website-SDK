import "../../support/polyfills/polyfills";
import test from "ava";
import sinon from "sinon";
import SdkEnvironment from '../../../src/shared/managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../../../src/shared/models/WindowEnvironmentKind';
import OneSignal from "../../../src/onesignal/OneSignal";


test('OneSignal.environment.getEnv()', async t => {
  t.is((OneSignal as any).environment.getEnv(), '');
});

test('OneSignal.environment.isPopup()', async t => {
  const stub = sinon.stub(SdkEnvironment, 'getWindowEnv').returns(WindowEnvironmentKind.OneSignalSubscriptionPopup);
  t.is((OneSignal as any).environment.isPopup(), true);
  stub.restore();
});

test('OneSignal.environment.isIframe()', async t => {
  const stub = sinon.stub(SdkEnvironment, 'getWindowEnv').returns(WindowEnvironmentKind.OneSignalProxyFrame);
  t.is((OneSignal as any).environment.isIframe(), true);
  stub.restore();
});
