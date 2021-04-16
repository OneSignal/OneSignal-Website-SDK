import { SinonSandbox } from 'sinon';
import nock from 'nock';
import ProxyFrameHost from "../../../src/modules/frames/ProxyFrameHost";
import AltOriginManager from "../../../src/managers/AltOriginManager";
import OneSignalApi from "../../../src/OneSignalApi";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import { TestEnvironment, TestEnvironmentConfig, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { ServerAppConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import { Subscription } from "../../../src/models/Subscription";
import { ExecutionContext } from 'ava';
import Database from '../../../src/services/Database';

export function isNullOrUndefined<T>(value: T | null | undefined): boolean {
  return typeof value === 'undefined' || value === null;
}

interface StubMessageChannelContext {
  originalMessageChannel?: MessageChannel;
}

export function stubMessageChannel(t: ExecutionContext<StubMessageChannelContext>) {
  // Stub MessageChannel
  const fakeClass = class Test { };
  t.context.originalMessageChannel = (global as any).MessageChannel;
  (global as any).MessageChannel = fakeClass;
}

// Mocks out any messages going to the *.os.tc iframe.
export function mockIframeMessaging(sinonSandbox: SinonSandbox) {
  sinonSandbox.stub(ProxyFrameHost.prototype, 'load').resolves(undefined);
  sinonSandbox.stub(AltOriginManager, 'removeDuplicatedAltOriginSubscription').resolves(undefined);
  sinonSandbox.stub(ProxyFrameHost.prototype, 'isSubscribed').callsFake(() => {});
  sinonSandbox.stub(ProxyFrameHost.prototype, 'runCommand').resolves(undefined);

  const mockIframeMessageReceiver = function (_msg: string, _data: object, resolve: Function) {
    // OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION
    resolve(true);
  };
  sinonSandbox.stub(ProxyFrameHost.prototype, 'message').callsFake(mockIframeMessageReceiver);
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
    this.sinonSandbox.stub(OneSignalApi, "jsonpLib").callsFake(
      function (_url: string, callback: Function) {
        callback(null, serverAppConfig);
      }
    );
  }

  mockBasicInitEnv(testEnvironmentConfig: TestEnvironmentConfig, customServerAppConfig?: ServerAppConfig) {
    OneSignal.initialized = false;

    this.sinonSandbox.stub(document, "visibilityState").value("visible");

    const isHttps = testEnvironmentConfig.httpOrHttps ?
      testEnvironmentConfig.httpOrHttps == HttpHttpsEnvironment.Https :
      undefined;
    const serverAppConfig = customServerAppConfig ||
      TestEnvironment.getFakeServerAppConfig(testEnvironmentConfig.integration!, isHttps);
    this.stubJSONP(serverAppConfig);
    this.sinonSandbox.stub(OneSignalApiBase, "get").resolves({});
  }
}

// Helper class to ensure the public OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC event fires
export class AssertInitSDK {
  private firedSDKInitializedPublic: boolean = false;

  public setupEnsureInitEventFires(t: ExecutionContext) {
    OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      this.firedSDKInitializedPublic = true;
      t.pass();
    });
  }

  public ensureInitEventFired() {
    if (!this.firedSDKInitializedPublic) {
      throw new Error("OneSignal.Init did not finish!");
    }
    this.firedSDKInitializedPublic = false;
  }
}

// PushSubscriptionOptions is a class present in browsers that support the Push API
export function setupBrowserWithPushAPIWithVAPIDEnv(sandbox: SinonSandbox): void {
  const classDef = function() {};
  classDef.prototype.applicationServerKey = null;
  classDef.prototype.userVisibleOnly = null;

  sandbox.stub((<any>global), "PushSubscriptionOptions").value(classDef);
}

export function createSubscription(playerId?: string): Subscription {
  const subscription = new Subscription();
  subscription.deviceId = playerId || Random.getRandomUuid();
  subscription.optedOut = false;
  subscription.subscriptionToken = "some_token";
  subscription.createdAt = new Date(2017, 11, 13, 2, 3, 4, 0).getTime();
  return subscription;
}

export async function setupFakePlayerId(): Promise<string> {
  const subscription: Subscription = new Subscription();
  subscription.deviceId = Random.getRandomUuid();
  await Database.setSubscription(subscription);
  return subscription.deviceId;
}
