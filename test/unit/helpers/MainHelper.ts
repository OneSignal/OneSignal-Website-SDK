import test, { ExecutionContext } from "ava";
import sinon, { SinonSandbox } from 'sinon';
import { NotificationPermission } from "../../../src/shared/models/NotificationPermission";
import { SubscriptionStateKind } from '../../../src/shared/models/SubscriptionStateKind';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { OneSignalUtils } from '../../../src/shared/utils/OneSignalUtils';
import MainHelper from "../../../src/shared/helpers/MainHelper";

let sinonSandbox: SinonSandbox;

test.beforeEach(async () => {
  sinonSandbox = sinon.sandbox.create();
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  // Required for sessionContext, not async
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(function (_t: ExecutionContext) {
  sinonSandbox.restore();
});

test("getCurrentNotificationType for default permission", async t => {
  sinonSandbox.stub(OneSignal.context.permissionManager, "getNotificationPermission")
    .resolves(NotificationPermission.Default);

  t.is(await MainHelper.getCurrentNotificationType(), SubscriptionStateKind.NoNativePermission);
});

test("getCurrentNotificationType for denied permission in HTTP context", async t => {
  sinonSandbox.stub(OneSignal.context.permissionManager, "getNotificationPermission")
    .resolves(NotificationPermission.Denied);
  sinonSandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").returns(true);

  t.is(await MainHelper.getCurrentNotificationType(), SubscriptionStateKind.NoNativePermission);
});

test("getCurrentNotificationType for denied permission in HTTPS context", async t => {
  sinonSandbox.stub(OneSignal.context.permissionManager, "getNotificationPermission")
    .resolves(NotificationPermission.Denied);
  sinonSandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").returns(false);

  t.is(await MainHelper.getCurrentNotificationType(), SubscriptionStateKind.NotSubscribed);
});

test("getCurrentNotificationType for granted permission: subscribed", async t => {
  sinonSandbox.stub(OneSignal.context.permissionManager, "getNotificationPermission")
    .resolves(NotificationPermission.Granted);
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
    
  t.is(await MainHelper.getCurrentNotificationType(), SubscriptionStateKind.Subscribed);
});

test("getCurrentNotificationType for granted permission: opted out", async t => {
  sinonSandbox.stub(OneSignal.context.permissionManager, "getNotificationPermission")
    .resolves(NotificationPermission.Granted);
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(false);
  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);

  t.is(await MainHelper.getCurrentNotificationType(), SubscriptionStateKind.UserOptedOut);
});

test("getCurrentNotificationType for granted permission: new user", async t => {
  sinonSandbox.stub(OneSignal.context.permissionManager, "getNotificationPermission")
    .resolves(NotificationPermission.Granted);
  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(false);

  t.is(await MainHelper.getCurrentNotificationType(), SubscriptionStateKind.NoNativePermission);
});
