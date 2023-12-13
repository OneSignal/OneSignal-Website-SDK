import sinon, { SinonSandbox } from 'sinon';
import test, { ExecutionContext } from 'ava';
import {
  TestEnvironment,
  TestEnvironmentConfig,
} from '../../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind } from '../../../../src/shared/models/AppConfig';
import { NotificationPermission } from '../../../../src/shared/models/NotificationPermission';
import Slidedown from '../../../../src/page/slidedown/Slidedown';
import EventsTestHelper from '../../../support/tester/EventsTestHelper';
import { SlidedownManager } from '../../../../src/page/managers/slidedownManager/SlidedownManager';
import { SlidedownPromptingTestHelper } from './_SlidedownPromptingTestHelpers';
import { mockGetIcon } from '../../../support/tester/utils';
import ConfirmationToast from '../../../../src/page/slidedown/ConfirmationToast';
import { stubServiceWorkerInstallation } from '../../../support/tester/sinonSandboxUtils';
import { PromptsManager } from '../../../../src/page/managers/PromptsManager';

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
const minimalPushSlidedownOptions = testHelper.getMinimalPushSlidedownOptions();
const minimalCategorySlidedownOptions =
  testHelper.getMinimalCategorySlidedownOptions();
const minimalSmsSlidedownOptions = testHelper.getMinimalSmsOptions();
const minimalEmailSlidedownOptions = testHelper.getMinimalEmailOptions();
const minimalSmsAndEmailOptions = testHelper.getMinimalSmsAndEmailOptions();

test.beforeEach(() => {
  mockGetIcon();
});

test.afterEach(function (_t: ExecutionContext) {
  sinonSandbox.restore();
  OneSignal._initCalled = false;
  OneSignal.__initAlreadyCalled = false;
  OneSignal._sessionInitAlreadyRunning = false;
});

const testConfig: TestEnvironmentConfig = {
  integration: ConfigIntegrationKind.Custom,
  permission: NotificationPermission.Default,
  pushIdentifier: 'granted',
  stubSetTimeout: true,
};

test('singular push slidedown prompts successfully', async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const showSlidedownSpy = sinonSandbox.spy(
    PromptsManager.prototype as any,
    'internalShowSlidedownPrompt',
  );
  await testHelper.initWithPromptOptions([minimalPushSlidedownOptions]);

  t.is(showSlidedownSpy.callCount, 1);
});

test('singular category slidedown prompts successfully', async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const showCatSlidedownSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'internalShowCategorySlidedown',
  );
  await testHelper.initWithPromptOptions([minimalCategorySlidedownOptions]);

  t.is(showCatSlidedownSpy.callCount, 1);
});

test('singular sms slidedown prompts successfully', async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const showSmsSlidedownSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'internalShowSmsSlidedown',
  );
  await testHelper.initWithPromptOptions([minimalSmsSlidedownOptions]);

  t.is(showSmsSlidedownSpy.callCount, 1);
});

test('singular email slidedown prompts successfully', async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const showEmailSlidedownSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'internalShowEmailSlidedown',
  );
  await testHelper.initWithPromptOptions([minimalEmailSlidedownOptions]);

  t.is(showEmailSlidedownSpy.callCount, 1);
});

test('singular sms & email slidedown prompts successfully', async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const showSmsAndEmailSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'internalShowSmsAndEmailSlidedown',
  );
  await testHelper.initWithPromptOptions([minimalSmsAndEmailOptions]);

  t.is(showSmsAndEmailSpy.callCount, 1);
});

test("session init 'spawns' as many autoPrompts as configured: 1", async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const spawnAutopromptsSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'spawnAutoPrompts',
  );
  const showDelayedPromptsSpy = sinonSandbox.stub(
    PromptsManager.prototype,
    'internalShowDelayedPrompt',
  );

  await testHelper.initWithPromptOptions([minimalPushSlidedownOptions]);

  t.true(spawnAutopromptsSpy.called);
  t.is(showDelayedPromptsSpy.callCount, 1);
});

test("session init 'spawns' as many autoPrompts as configured: 2", async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const spawnAutopromptsSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'spawnAutoPrompts',
  );
  const showDelayedPromptsSpy = sinonSandbox.stub(
    PromptsManager.prototype,
    'internalShowDelayedPrompt',
  );

  await testHelper.initWithPromptOptions([
    minimalPushSlidedownOptions,
    minimalCategorySlidedownOptions,
  ]);

  t.true(spawnAutopromptsSpy.called);
  t.is(showDelayedPromptsSpy.callCount, 2);
});

test("session init 'spawns' as many autoPrompts as configured: 3", async (t) => {
  await testHelper.setupWithStubs(testConfig, t);
  const spawnAutopromptsSpy = sinonSandbox.spy(
    PromptsManager.prototype,
    'spawnAutoPrompts',
  );
  const showDelayedPromptsSpy = sinonSandbox.stub(
    PromptsManager.prototype,
    'internalShowDelayedPrompt',
  );

  await testHelper.initWithPromptOptions([
    minimalPushSlidedownOptions,
    minimalCategorySlidedownOptions,
    minimalSmsAndEmailOptions,
  ]);

  t.true(spawnAutopromptsSpy.called);
  t.is(showDelayedPromptsSpy.callCount, 3);
});

test('correct number of slidedowns are enqueued: once', async (t) => {
  await TestEnvironment.setupOneSignalPageWithStubs(
    sinonSandbox,
    testConfig,
    t,
  );
  const enqueueSpy = sinonSandbox.spy(SlidedownManager.prototype, 'enqueue');
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const queuedPromise = new Promise<void>((resolve) => {
    OneSignal.on(Slidedown.EVENTS.QUEUED, () => {
      eventsHelper.eventCounts.queued += 1;
      if (eventsHelper.eventCounts.queued === 1) {
        resolve();
      }
    });
  });

  await testHelper.initWithPromptOptions([
    testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 0),
    testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 0),
  ]);

  await queuedPromise;

  t.is(enqueueSpy.callCount, 1);
});

test('correct number of slidedowns are enqueued: twice', async (t) => {
  await TestEnvironment.setupOneSignalPageWithStubs(
    sinonSandbox,
    testConfig,
    t,
  );
  const enqueueSpy = sinonSandbox.spy(SlidedownManager.prototype, 'enqueue');
  const eventsHelper = new EventsTestHelper(sinonSandbox);

  const queuedPromise = new Promise<void>((resolve) => {
    OneSignal.on(Slidedown.EVENTS.QUEUED, () => {
      eventsHelper.eventCounts.queued += 1;
      if (eventsHelper.eventCounts.queued === 2) {
        resolve();
      }
    });
  });

  await testHelper.initWithPromptOptions([
    testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 0),
    testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 0),
    testHelper.addPromptDelays(minimalSmsAndEmailOptions, 1, 0),
  ]);

  await queuedPromise;

  t.is(enqueueSpy.callCount, 2);
});

test('on slidedown dismiss with slidedown queue non-empty, show next slidedown', async (t) => {
  await TestEnvironment.setupOneSignalPageWithStubs(
    sinonSandbox,
    testConfig,
    t,
  );
  sinonSandbox
    .stub(SlidedownManager.prototype as any, 'checkIfSlidedownShouldBeShown')
    .resolves(true);
  const eventsHelper = new EventsTestHelper(sinonSandbox);

  const enqueueSpy = sinonSandbox.spy(SlidedownManager.prototype, 'enqueue');
  const showQueuedSpy = sinonSandbox.spy(
    SlidedownManager.prototype,
    'showQueued',
  );

  const queuedPromise = new Promise<void>((resolve) => {
    OneSignal.on(Slidedown.EVENTS.QUEUED, () => {
      eventsHelper.eventCounts.queued += 1;
      if (eventsHelper.eventCounts.queued === 1) {
        EventsTestHelper.simulateSlidedownAllow();
        resolve();
      }
    });
  });

  const closedPromise = eventsHelper.getClosedPromiseWithEventCounts();
  const shownPromise = eventsHelper.getShownPromiseWithEventCounts(2);

  await testHelper.initWithPromptOptions([
    testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 0),
    testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 1),
  ]);

  await queuedPromise;
  await closedPromise;
  await shownPromise;

  t.is(eventsHelper.eventCounts.shown, 2);
  t.is(enqueueSpy.callCount, 1);
  t.is(showQueuedSpy.callCount, 1);
});

test('push & cat slidedowns configured -> cat shown first -> push slidedown not shown', async (t) => {
  await TestEnvironment.setupOneSignalPageWithStubs(
    sinonSandbox,
    testConfig,
    t,
  );
  stubServiceWorkerInstallation(sinonSandbox);
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const enqueueSpy = sinonSandbox.spy(SlidedownManager.prototype, 'enqueue');
  const showQueuedSpy = sinonSandbox.spy(
    SlidedownManager.prototype,
    'showQueued',
  );

  const queuedPromise = new Promise<void>((resolve) => {
    OneSignal.on(Slidedown.EVENTS.QUEUED, () => {
      eventsHelper.eventCounts.queued += 1;
      if (eventsHelper.eventCounts.queued === 1) {
        EventsTestHelper.simulateSlidedownAllow();
        resolve();
      }
    });
  });

  const closedPromise = eventsHelper.getClosedPromiseWithEventCounts();
  const shownPromise = eventsHelper.getShownPromiseWithEventCounts(1);

  await testHelper.initWithPromptOptions([
    testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 0),
    testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 1),
  ]);

  await queuedPromise;
  await closedPromise;
  await shownPromise;

  t.is(eventsHelper.eventCounts.shown, 1);
  t.is(enqueueSpy.callCount, 1);
  t.is(showQueuedSpy.callCount, 1);
});

test('confirmation toast shown and closed after allow', async (t) => {
  await TestEnvironment.setupOneSignalPageWithStubs(
    sinonSandbox,
    testConfig,
    t,
  );
  const eventsHelper = new EventsTestHelper(sinonSandbox);

  const toastShownSpy = sinonSandbox.spy(ConfirmationToast.prototype, 'show');
  const toastCloseSpy = sinonSandbox.spy(ConfirmationToast.prototype, 'close');

  const slidedownShownPromise = eventsHelper.getShownPromiseWithEventCounts(1);
  const toastShownPromise = EventsTestHelper.getToastShownPromise();
  const toastClosePromise = EventsTestHelper.getToastClosedPromise();

  await testHelper.initWithPromptOptions([
    testHelper.addPromptDelays(minimalEmailSlidedownOptions, 1, 0),
  ]);

  await slidedownShownPromise;

  // simulate typing in a valid email
  testHelper.inputEmail('rodrigo@onesignal.com');
  EventsTestHelper.simulateSlidedownAllow();

  await toastShownPromise;
  await toastClosePromise;

  t.is(toastShownSpy.callCount, 1);
  t.is(toastCloseSpy.callCount, 1);
});
