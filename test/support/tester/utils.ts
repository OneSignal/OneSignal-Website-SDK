import { SinonSandbox } from 'sinon';
import nock from 'nock';
import OneSignalApi from '../../../src/shared/api/OneSignalApi';
import {
  TestEnvironment,
  TestEnvironmentConfig,
  HttpHttpsEnvironment,
} from '../../support/sdk/TestEnvironment';
import { ServerAppConfig } from '../../../src/shared/models/AppConfig';
import Random from '../../support/tester/Random';
import { Subscription } from '../../../src/shared/models/Subscription';
import { ExecutionContext } from 'ava';
import Database from '../../../src/shared/services/Database';
import OneSignalApiBase from '../../../src/shared/api/OneSignalApiBase';

export function isNullOrUndefined<T>(value: T | null | undefined): boolean {
  return typeof value === 'undefined' || value === null;
}

interface StubMessageChannelContext {
  originalMessageChannel?: MessageChannel;
}

export function stubMessageChannel(
  t: ExecutionContext<StubMessageChannelContext>,
) {
  // Stub MessageChannel
  const fakeClass = class Test {};
  t.context.originalMessageChannel = (global as any).MessageChannel;
  (global as any).MessageChannel = fakeClass;
}

export function mockGetIcon() {
  nock('https://onesignal.com')
    .get(/.*icon$/)
    .reply(200, (_uri: string, _requestBody: string) => {
      return { success: true };
    });
}

export class InitTestHelper {
  private readonly sinonSandbox: SinonSandbox;

  constructor(sinonSandbox: SinonSandbox) {
    this.sinonSandbox = sinonSandbox;
  }
  stubJSONP(serverAppConfig: ServerAppConfig) {
    this.sinonSandbox.stub(OneSignalApi, 'jsonpLib').callsFake(function (
      _url: string,
      callback: Function,
    ) {
      callback(null, serverAppConfig);
    });
  }

  mockBasicInitEnv(
    testEnvironmentConfig: TestEnvironmentConfig,
    customServerAppConfig?: ServerAppConfig,
  ) {
    OneSignal.initialized = false;

    this.sinonSandbox.stub(document, 'visibilityState').value('visible');

    const isHttps = testEnvironmentConfig.httpOrHttps
      ? testEnvironmentConfig.httpOrHttps == HttpHttpsEnvironment.Https
      : undefined;
    const serverAppConfig =
      customServerAppConfig ||
      TestEnvironment.getFakeServerAppConfig(
        testEnvironmentConfig.integration!,
        isHttps,
      );
    this.stubJSONP(serverAppConfig);
    this.sinonSandbox.stub(OneSignalApiBase, 'get').resolves({});
  }
}

// Helper class to ensure the public OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC event fires
export class AssertInitSDK {
  private firedSDKInitializedPublic = false;

  public setupEnsureInitEventFires(t: ExecutionContext) {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      this.firedSDKInitializedPublic = true;
      t.pass();
    });
  }

  public ensureInitEventFired() {
    if (!this.firedSDKInitializedPublic) {
      throw new Error('OneSignal.Init did not finish!');
    }
    this.firedSDKInitializedPublic = false;
  }
}

// PushSubscriptionOptions is a class present in browsers that support the Push API
export function setupBrowserWithPushAPIWithVAPIDEnv(
  sandbox: SinonSandbox,
): void {
  const classDef = function () {};
  classDef.prototype.applicationServerKey = null;
  classDef.prototype.userVisibleOnly = null;

  sandbox.stub(<any>global, 'PushSubscriptionOptions').value(classDef);
}

export function createSubscription(playerId?: string): Subscription {
  const subscription = new Subscription();
  subscription.deviceId = playerId || Random.getRandomUuid();
  subscription.optedOut = false;
  subscription.subscriptionToken = 'some_token';
  subscription.createdAt = new Date(2017, 11, 13, 2, 3, 4, 0).getTime();
  return subscription;
}

export async function setupFakePlayerId(): Promise<string> {
  const subscription: Subscription = new Subscription();
  subscription.deviceId = Random.getRandomUuid();
  await Database.setSubscription(subscription);
  return subscription.deviceId;
}

export function simulateEventOfTypeOnElement(
  type: string,
  element: Element | null,
): void {
  const event = document.createEvent('Event');
  event.initEvent(type, true, true);
  element?.dispatchEvent(event);
}
