import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { isPushNotificationsSupported } from '../../../src/utils';
import { oneSignalSdkInit } from '../../../src/utils/pageSdkInit';


test.todo("should initialize a global instance in Service Worker environment");

test.todo("should initialize a global instance in browser DOM environment");

test.todo("should execute OneSignal functions that were queued before SDK initialization");

test("should initialize a phantom stub in an unsupported environment", async t => {
  // Make the environment unsupported by deleting Promise functionality
  await TestEnvironment.initialize();
  (window as any).Promise = undefined;

  oneSignalSdkInit();
  const untypedOneSignalStub = (window as any).OneSignal as any;

  t.false(untypedOneSignalStub.isPushNotificationsSupported());

  // Promise-based functions should all share the same stub
  t.true(untypedOneSignalStub.setDefaultTitle === untypedOneSignalStub.setDefaultNotificationUrl);
  t.true(untypedOneSignalStub.setDefaultNotificationUrl === untypedOneSignalStub.syncHashedEmail);
  t.true(untypedOneSignalStub.syncHashedEmail === untypedOneSignalStub.getTags);
  t.true(untypedOneSignalStub.getTags === untypedOneSignalStub.sendTag);
  t.true(untypedOneSignalStub.sendTag === untypedOneSignalStub.sendTags);
  t.true(untypedOneSignalStub.sendTags === untypedOneSignalStub.deleteTag);
  t.true(untypedOneSignalStub.deleteTag === untypedOneSignalStub.deleteTags);
  t.true(untypedOneSignalStub.deleteTags === untypedOneSignalStub.addListenerForNotificationOpened);
  t.true(untypedOneSignalStub.addListenerForNotificationOpened === untypedOneSignalStub.isPushNotificationsEnabled);
  t.true(untypedOneSignalStub.isPushNotificationsEnabled === untypedOneSignalStub.setSubscription);
  t.true(untypedOneSignalStub.setSubscription === untypedOneSignalStub.getUserId);
  t.true(untypedOneSignalStub.getUserId === untypedOneSignalStub.getRegistrationId);
  t.true(untypedOneSignalStub.getRegistrationId === untypedOneSignalStub.getSubscription);
  t.true(untypedOneSignalStub.getSubscription === untypedOneSignalStub.sendSelfNotification);
  t.true(untypedOneSignalStub.sendSelfNotification === untypedOneSignalStub.setEmail);
  t.true(untypedOneSignalStub.setEmail === untypedOneSignalStub.logoutEmail);
});
