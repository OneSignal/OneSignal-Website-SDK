import "../../support/polyfills/polyfills";
import test, { TestContext, Context } from "ava";
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import nock from "nock";
import {
    TestEnvironment, HttpHttpsEnvironment, TestEnvironmentConfig
} from '../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind, ServerAppConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import OneSignalApiBase from "../../../src/OneSignalApiBase";
import {
    stubMessageChannel, mockIframeMessaging, mockWebPushAnalytics, InitTestHelper
} from '../../support/tester/utils';
import { DynamicResourceLoader, ResourceLoadState } from "../../../src/services/DynamicResourceLoader";
import { ServiceWorkerManager } from "../../../src/managers/ServiceWorkerManager";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import { SessionManager } from "../../../src/managers/SessionManager";
import {
    stubServiceWorkerInstallation,
} from "../../support/tester/sinonSandboxUtils";
import LocalStorage from '../../../src/utils/LocalStorage';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const initTestHelper = new InitTestHelper(sinonSandbox);
const playerId = Random.getRandomUuid();
const appId = Random.getRandomUuid();

enum DelayedPromptType {
    Native = "native",
    Slidedown = "slidedown"
}

test.beforeEach(async () => {
    // tests use customizable beforeEach method defined below. add logic there if needed.
    mockWebPushAnalytics();
});

test.afterEach(function (_t: TestContext) {
    sinonSandbox.restore();

    OneSignal._initCalled = false;
    OneSignal.__initAlreadyCalled = false;
    OneSignal._sessionInitAlreadyRunning = false;
});

/**
 * Unit Tests
 */

test.serial(`Delayed Prompt: native prompt is shown after 1 page view`, async t => {
    await beforeTest(t);
    stubServiceWorkerInstallation(sinonSandbox);
    
    const promptShownPromise = new Promise((resolve, reject) => {
        OneSignal.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
            resolve();
        });

        setTimeout(reject, 500);
    });
    
    const nativeSpy = sinonSandbox.stub(window.Notification, "requestPermission");
    const initPromise = initWithDelayedOptions(DelayedPromptType.Native, 0, 1);

    await initPromise;
    await promptShownPromise;
    const pageViews = LocalStorage.getLocalPageViewCount();
    t.is(nativeSpy.calledOnce, true);
    t.is(pageViews, 1);
});

/*
test.serial(`Delayed Prompt: native prompt not called after 1 page view`, async t => {
    await beforeTest(t);
    stubServiceWorkerInstallation(sinonSandbox);

    OneSignal.on(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED, () => {
        t.fail();
    });

    const initPromise = initWithDelayedOptions(DelayedPromptType.Native, 0, 2);

    await initPromise;
    const pageViews = LocalStorage.getLocalPageViewCount();
    t.is(pageViews, 1);
});
*/

/**
 * initWithDelayedOptions
 *  - type {string}: either 'native' or 'slidedown'
 *  - timeDelay {number}
 *  - pageViews {number}
 */
async function initWithDelayedOptions(type: DelayedPromptType, timeDelay: number, pageViews: number) {
    const promptOptions = getPromptOptions(type, timeDelay, pageViews);
    return OneSignal.init({
        appId,
        autoResubscribe: true,
        promptOptions
    });
}

async function beforeTest(
    t: TestContext & Context<any>,
    customServerAppConfig?: ServerAppConfig
) {
    const testConfig: TestEnvironmentConfig = {
        httpOrHttps: HttpHttpsEnvironment.Https,
        integration: ConfigIntegrationKind.Custom,
        permission: NotificationPermission.Default
    };
    await TestEnvironment.initialize(testConfig);
    initTestHelper.mockBasicInitEnv(testConfig, customServerAppConfig);
    OneSignal.initialized = false;
    OneSignal.__doNotShowWelcomeNotification = true;

    sinonSandbox.stub(window.Notification, "permission").value(testConfig.permission || "default");

    const createPlayerPostStub = sinonSandbox.stub(OneSignalApiBase, "post")
        .resolves({ success: true, id: playerId });
    const onSessionStub = sinonSandbox.stub(SessionManager.prototype, "upsertSession").resolves();
    // const onSessionStub = sinonSandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

    sinonSandbox.stub(DynamicResourceLoader.prototype, "loadSdkStylesheet").resolves(ResourceLoadState.Loaded);
    sinonSandbox.stub(ServiceWorkerManager.prototype, "installWorker").resolves();
    nock('https://onesignal.com')
        .get(/.*icon$/)
        .reply(200, (_uri: string, _requestBody: string) => {
            return { success: true };
        });

    if (testConfig.httpOrHttps === HttpHttpsEnvironment.Http) {
        stubMessageChannel(t);
        mockIframeMessaging(sinonSandbox);
    }
    return { createPlayerPostStub, onSessionStub };
}

function getPromptOptions(
    type: DelayedPromptType,
    timeDelay: number,
    pageViews: number
) {
    return {
        autoPrompt: true,
        [type]: {
            enabled: true,
            autoPrompt: true,
            timeDelay,
            pageViews
        }
    };
}