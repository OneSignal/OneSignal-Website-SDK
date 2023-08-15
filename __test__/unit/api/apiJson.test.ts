import OneSignal from "../../../src/onesignal/OneSignal";
import { OneSignalWithIndex } from "./OneSignalWithIndex";
import { IdentityExecutor } from "../../../src/core/executors/IdentityExecutor";
import { PropertiesExecutor } from "../../../src/core/executors/PropertiesExecutor";
import { SubscriptionExecutor } from "../../../src/core/executors/SubscriptionExecutor";
import { matchApiToSpec } from "../../support/helpers/api";

describe('API matches spec file', () => {
  let OneSignalWithIndex: OneSignalWithIndex;

  beforeAll(() => {
    OneSignalWithIndex = OneSignal as OneSignalWithIndex;
    test.stub(PropertiesExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
    test.stub(IdentityExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
    test.stub(SubscriptionExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('Check top-level OneSignal API', async () => {
    try {
      await matchApiToSpec({ OneSignal: OneSignalWithIndex }, 'OneSignal');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check Slidedown namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'Slidedown');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check Notifications namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'Notifications');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check Session namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'Session');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check User namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'User');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check PushSubscription namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex['User'], 'PushSubscription');
    } catch (e) {
      test.fail(e.message);
    }
  });
});
