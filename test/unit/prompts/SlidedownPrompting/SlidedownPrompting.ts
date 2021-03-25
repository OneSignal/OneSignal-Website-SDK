import sinon, { SinonSandbox } from "sinon";
import test, { ExecutionContext } from "ava";
import {
    HttpHttpsEnvironment, TestEnvironment, TestEnvironmentConfig
} from '../../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind } from '../../../../src/models/AppConfig';
import { NotificationPermission } from "../../../../src/models/NotificationPermission";
import { PromptsManager } from '../../../../src/managers/PromptsManager';
import Slidedown from "../../../../src/slidedown/Slidedown";
import EventsTestHelper from "../../../support/tester/EventsTestHelper";
import { SlidedownManager } from "../../../../src/managers/slidedownManager/SlidedownManager";
import { SlidedownPromptingTestHelper } from "./_SlidedownPromptingTestHelpers";

/**
 * PROMPTING LOGIC UNIT TESTS FOR WEB PROMPTS FEATURE
 * Tests prompting behavior of things like
 *  - showing multiple slidedowns
 *  - slidedown queues
 *  - slidedown configuration
 *  - slidedown behavior
 *  - slidedown manager behavior
 *  - ...etc
 */

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const testHelper = new SlidedownPromptingTestHelper(sinonSandbox);
const minimalPushSlidedownOptions = testHelper.getMinimalCategorySlidedownOptions();
const minimalCategorySlidedownOptions = testHelper.getMinimalCategorySlidedownOptions();

const eventCounts = {
    shown  : 0,
    closed : 0,
    queued : 0
};


test.afterEach(function (_t: ExecutionContext) {
    sinonSandbox.restore();

    OneSignal._initCalled = false;
    OneSignal.__initAlreadyCalled = false;
    OneSignal._sessionInitAlreadyRunning = false;
    eventCounts.shown   = 0;
    eventCounts.closed  = 0;
    eventCounts.queued  = 0;
});

const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Default,
    pushIdentifier: 'granted',
    stubSetTimeout: true
};

test.serial(`singular push slidedown prompts successfully`, async t => {
    await testHelper.setupWithStubs(testConfig, t);
    const showSlidedownSpy = sinonSandbox.stub(PromptsManager.prototype, "internalShowSlidedownPrompt").resolves();
    await testHelper.initWithPromptOptions([ minimalPushSlidedownOptions ]);

    t.is(showSlidedownSpy.callCount, 1);
});

test.serial(`singular category slidedown prompts successfully`, async t => {
    await testHelper.setupWithStubs(testConfig, t);
    const showCatSlidedownSpy = sinonSandbox.stub(PromptsManager.prototype, "internalShowCategorySlidedown").resolves();
    await testHelper.initWithPromptOptions([ minimalCategorySlidedownOptions ]);

    t.is(showCatSlidedownSpy.callCount, 1);
});

test.serial(`session init 'spawns' as many autoPrompts as configured`, async t => {
    await testHelper.setupWithStubs(testConfig, t);
    const spawnAutopromptsSpy   = sinonSandbox.spy(PromptsManager.prototype, "spawnAutoPrompts");
    const showDelayedPromptsSpy = sinonSandbox.stub(PromptsManager.prototype, "internalShowDelayedPrompt");

    await testHelper.initWithPromptOptions([ minimalPushSlidedownOptions, minimalCategorySlidedownOptions ]);

    t.true(spawnAutopromptsSpy.called);
    t.is(showDelayedPromptsSpy.callCount, 2);
});

/* -- TO DO: FIX RACE CONDITION --
test.serial(`on slidedown dismiss with slidedown queue non-empty, show next slidedown`, async t => {
    await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
    sinonSandbox.stub(SlidedownManager.prototype as any, "checkIfSlidedownShouldBeShown").resolves(true);
    const eventsHelper = new EventsTestHelper(sinonSandbox);

    const enqueueSpy = sinonSandbox.spy(SlidedownManager.prototype, "enqueue");
    const showQueuedSpy = sinonSandbox.spy(SlidedownManager.prototype, "showQueued");

    const queuedPromise = new Promise<void>(resolve => {
      OneSignal.on(Slidedown.EVENTS.QUEUED, () => {
        eventCounts.queued+=1;
        // all slidedowns have been enqueued by this point
        // first slidedown should be showing
        if (eventCounts.queued === 1) {
            t.is(eventCounts.shown, 1);
            eventsHelper.simulateNativeAllowAfterShown();
            eventsHelper.simulateSlidedownAllow();
            resolve();
        }
      });
    });

    const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
    const closedPromise = EventsTestHelper.getClosedPromiseWithEventCounts(eventCounts);
    const shownPromise = EventsTestHelper.getShownPromiseWithEventCounts(eventCounts, 2);

    await testHelper.initWithPromptOptions([
        testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 0),
        testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 1)
    ]);

    await queuedPromise;
    await subscriptionPromise;
    await closedPromise;
    await shownPromise;

    t.is(eventCounts.shown, 2);
    t.is(enqueueSpy.callCount, 1);
    t.is(showQueuedSpy.callCount, 1);
});

test.serial(`push slidedown and category slidedown configured -> category shown first -> push ` +
    `slidedown not shown`, async t => {
    const eventCounts = {
        shown  : 0,
        closed : 0,
        queued : 0
    };

    await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
    sinonSandbox.stub(SlidedownManager.prototype as any, "checkIfSlidedownShouldBeShown").resolves(true);
    const eventsHelper = new EventsTestHelper(sinonSandbox);

    const enqueueSpy = sinonSandbox.spy(SlidedownManager.prototype, "enqueue");
    const showQueuedSpy = sinonSandbox.spy(SlidedownManager.prototype, "showQueued");

    const queuedPromise = new Promise<void>(resolve => {
      OneSignal.on(Slidedown.EVENTS.QUEUED, () => {
        eventCounts.queued+=1;
        // all slidedowns have been enqueued by this point
        // first slidedown should be showing
        if (eventCounts.queued === 1) {
            t.is(eventCounts.shown, 1);
            eventsHelper.simulateNativeAllowAfterShown();
            eventsHelper.simulateSlidedownAllow();
            resolve();
        }
      });
    });

    const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
    const closedPromise = EventsTestHelper.getClosedPromiseWithEventCounts(eventCounts);
    const shownPromise = EventsTestHelper.getShownPromiseWithEventCounts(eventCounts);

    await testHelper.initWithPromptOptions([
        testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 1),
        testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 0)
    ]);

    await queuedPromise;
    await subscriptionPromise;
    await closedPromise;
    await shownPromise;

    t.is(eventCounts.shown, 1);
    t.is(enqueueSpy.callCount, 1);
    t.is(showQueuedSpy.callCount, 1);

});
*/

test.todo(`if autoPrompt already showing -> programmatically prompt second slidedown -> ` +
    `do not enqueue slidedown`);
test.todo(`push slidedown and category slidedown configured -> same delay -> only category slidedown mounted`);
test.todo(`push slidedown and category slidedown configured -> push first -> ` +
    `different delay -> both shown one after other`);
test.todo(`push slidedown and smsAndEmail configured -> different delay -> both shown one after other`);
test.todo(`multiple slidedowns of same type with different options are shown with respective config`);
