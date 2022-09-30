import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/onesignal/OneSignal';
import sinon from 'sinon';
import Context from '../../../src/page/models/Context';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';
import { setUserAgent } from '../../support/tester/browser';
import Random from '../../support/tester/Random';
import SdkEnvironment from '../../../src/shared/managers/SdkEnvironment';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
});

test('should set and get stored permission correctly', async t => {
  const permissionManager = OneSignal.context.permissionManager;

  // No existing stored permission should exist
  t.is( permissionManager.getStoredPermission(), 'default');

   permissionManager.setStoredPermission(NotificationPermission.Default);
  t.is( permissionManager.getStoredPermission(), NotificationPermission.Default);
});

test('should interpret ambiguous browser permission correctly', async t => {
  const permissionManager = OneSignal.context.permissionManager;

  // A reported permission of default is always accurate
  t.is(
    await permissionManager.getInterpretedAmbiguousPermission(NotificationPermission.Default),
    NotificationPermission.Default
  );

  // A reported permission of granted is always accurate
  t.is(
    await permissionManager.getInterpretedAmbiguousPermission(NotificationPermission.Granted),
    NotificationPermission.Granted
  );

  // A reported permission of denied, without any previously stored permission, should be assumed to
  // be default
  t.is(permissionManager.getStoredPermission(), 'default');
  t.is(
    await permissionManager.getInterpretedAmbiguousPermission(NotificationPermission.Denied),
    NotificationPermission.Default
  );

  // A reported permission of denied, with a stored permission, should be assumed to be the stored
  // permission (in this case default)
  permissionManager.setStoredPermission(NotificationPermission.Default);
  t.is(
    await permissionManager.getInterpretedAmbiguousPermission(NotificationPermission.Denied),
    NotificationPermission.Default
  );

  // A reported permission of denied, with a stored permission, should be assumed to be the stored
  // permission (in this case granted)
  permissionManager.setStoredPermission(NotificationPermission.Granted);
  t.is(
    await permissionManager.getInterpretedAmbiguousPermission(NotificationPermission.Denied),
    NotificationPermission.Granted
  );

  // A reported permission of denied, with a stored permission, should be assumed to be the stored
  // permission (in this case denied)
  permissionManager.setStoredPermission(NotificationPermission.Denied);
  t.is(
    await permissionManager.getInterpretedAmbiguousPermission(NotificationPermission.Denied),
    NotificationPermission.Denied
  );
});

test('should detect an insecure top-level frame', async t => {
  t.false(SdkEnvironment.isInsecureOrigin());

  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http,
    initializeAsIframe: false
  });
  t.true(SdkEnvironment.isInsecureOrigin());
});

test('should detect a cross-origin frame-context', async t => {
  const permissionManager = OneSignal.context.permissionManager;

  // Default test harness should mock a top-level frame
  t.false(permissionManager.isCurrentFrameContextCrossOrigin());

  // The test initializer will construct window.top as an inaccessible cross-origin frame
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    initializeAsIframe: true
  });
  t.true(permissionManager.isCurrentFrameContextCrossOrigin());
});

test('should not detect an ambiguous permission environment', async t => {
  const permissionManager = OneSignal.context.permissionManager;

  setUserAgent(BrowserUserAgent.FirefoxMacSupported);
  t.false(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Denied));

  setUserAgent(BrowserUserAgent.SafariSupportedMac);
  t.false(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Denied));

  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  t.false(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Granted));
  t.false(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Default));

  const isCurrentFrameContextCrossOriginStub = sinon
    .stub(permissionManager, 'isCurrentFrameContextCrossOrigin')
    .returns(false);
  const isFrameContextInsecureStub = sinon
    .stub(SdkEnvironment, 'isFrameContextInsecure')
    .resolves(false);
  t.false(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Denied));
  isCurrentFrameContextCrossOriginStub.restore();
  isFrameContextInsecureStub.restore();
});

test('should use browser reported permission value in non-ambiguous environment for getNotificationPermission', async t => {
  // Catches the case where getNotificationPermission doesn't wait on the isPermissionEnvironmentAmbiguous promise
  const permissionManager = OneSignal.context.permissionManager;
  (window as any).Notification.permission = "denied";
  setUserAgent(BrowserUserAgent.FirefoxLinuxSupported);

  const isCurrentFrameContextCrossOriginStub = sinon
    .stub(permissionManager, 'isCurrentFrameContextCrossOrigin')
    .returns(false);
  const isFrameContextInsecureStub = sinon
    .stub(SdkEnvironment, 'isFrameContextInsecure')
    .resolves(false);
  t.deepEqual(await permissionManager.getNotificationPermission(), NotificationPermission.Denied);
  isCurrentFrameContextCrossOriginStub.restore();
  isFrameContextInsecureStub.restore();
});

test('should detect an ambiguous permission environment', async t => {
  const permissionManager = OneSignal.context.permissionManager;

  setUserAgent(BrowserUserAgent.OperaDesktopSupported);

  const isCurrentFrameContextCrossOriginStub = sinon
    .stub(permissionManager, 'isCurrentFrameContextCrossOrigin')
    .returns(true);
  const isFrameContextInsecureStub = sinon
    .stub(SdkEnvironment, 'isFrameContextInsecure')
    .resolves(false);
  t.true(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Denied));
  isCurrentFrameContextCrossOriginStub.restore();
  isFrameContextInsecureStub.restore();

  // Reverse false/true
  {
    const isCurrentFrameContextCrossOriginStub = sinon
      .stub(permissionManager, 'isCurrentFrameContextCrossOrigin')
      .returns(false);
    const isFrameContextInsecureStub = sinon
      .stub(SdkEnvironment, 'isFrameContextInsecure')
      .resolves(true);
    t.true(await permissionManager.isPermissionEnvironmentAmbiguous(NotificationPermission.Denied));
    isCurrentFrameContextCrossOriginStub.restore();
    isFrameContextInsecureStub.restore();
  }
});
