import sinon, { SinonSandbox } from "sinon";
import test, { ExecutionContext } from "ava";
import { ConfigIntegrationKind } from "../../../src/shared/models/AppConfig";
import { NotificationPermission } from "../../../src/shared/models/NotificationPermission";
import {
  TestEnvironmentConfig,
  HttpHttpsEnvironment,
  TestEnvironment
} from "../../support/sdk/TestEnvironment";
import EventsTestHelper from "../../support/tester/EventsTestHelper";
import { mockGetIcon } from "../../support/tester/utils";
import { SlidedownPromptingTestHelper } from "../prompts/SlidedownPrompting/_SlidedownPromptingTestHelpers";
import { DismissHelper } from "../../../src/shared/helpers/DismissHelper";
import { SlidedownManager } from "../../../src/page/managers/slidedownManager/SlidedownManager";
import { DismissTimeKey } from "../../../src/page/models/Dismiss";
import Slidedown from "../../../src/page/slidedown/Slidedown";
import { AutoPromptOptions } from "../../../src/page/managers/PromptsManager";
import TimedLocalStorage from "../../../src/page/modules/TimedLocalStorage";
import OneSignal from "../../../src/onesignal/OneSignal";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const testHelper = new SlidedownPromptingTestHelper(sinonSandbox);

const minimalPushSlidedownOptions     = testHelper.getMinimalPushSlidedownOptions();
const minimalSmsAndEmailOptions       = testHelper.getMinimalSmsAndEmailOptions();
const minimalCategorySlidedownOptions = testHelper.getMinimalCategorySlidedownOptions();

test.beforeEach(() => {
  sinon.useFakeTimers();
  mockGetIcon();
  sinonSandbox.stub(OneSignal, "initializeCoreModuleAndUserNamespace").resolves();
});

test.afterEach(function (_t: ExecutionContext) {
    sinonSandbox.restore();
    OneSignal._initCalled = false;
    OneSignal.__initAlreadyCalled = false;
    OneSignal._sessionInitAlreadyRunning = false;
});

const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Default,
    pushIdentifier: 'granted',
    stubSetTimeout: true,
};

test("push slidedown shown, on dismiss, mark push prompt as dismissed", async t => {
  await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
  sinonSandbox.stub(SlidedownManager.prototype as any, "checkIfSlidedownShouldBeShown").resolves(true);
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const dismissSpy = sinonSandbox.spy(DismissHelper, "markPromptDismissedWithType");
  EventsTestHelper.simulateSlidedownDismissAfterShown();

  const closedPromise = eventsHelper.getClosedPromiseWithEventCounts();

  await testHelper.initWithPromptOptions([
      testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 0),
  ]);

  await closedPromise;
  const pushDismissed    = await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNotificationPrompt);
  const nonPushDismissed = await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNonPushPrompt);

  t.is(dismissSpy.callCount, 1);
  t.is(pushDismissed, "dismissed");
  t.is(nonPushDismissed, null);
});

test("on push slidedown shown, allow, mark push prompt as dismissed", async t => {
  await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
  sinonSandbox.stub(SlidedownManager.prototype as any, "checkIfSlidedownShouldBeShown").resolves(true);
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const dismissSpy = sinonSandbox.spy(DismissHelper, "markPromptDismissedWithType");
  EventsTestHelper.simulateSlidedownAllowAfterShown();

  const shownPromise  = eventsHelper.getShownPromiseWithEventCounts();
  const closedPromise = eventsHelper.getClosedPromiseWithEventCounts();

  await testHelper.initWithPromptOptions([
      testHelper.addPromptDelays(minimalPushSlidedownOptions, 1, 0),
  ]);

  await shownPromise;
  await closedPromise;
  const pushDismissed =    await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNotificationPrompt);
  const nonPushDismissed = await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNonPushPrompt);

  t.is(eventsHelper.eventCounts.shown, 1);
  t.is(dismissSpy.callCount, 1);
  t.is(pushDismissed, "dismissed");
  t.is(nonPushDismissed, null);
});

test("on non-push slidedown dismiss, mark non-push prompt as dismissed", async t => {
  await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
  sinonSandbox.stub(SlidedownManager.prototype as any, "checkIfSlidedownShouldBeShown").resolves(true);
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const dismissSpy = sinonSandbox.spy(DismissHelper, "markPromptDismissedWithType");
  EventsTestHelper.simulateSlidedownDismissAfterShown();

  const shownPromise = eventsHelper.getShownPromiseWithEventCounts(1);
  const closedPromise = eventsHelper.getClosedPromiseWithEventCounts();


  await testHelper.initWithPromptOptions([
      testHelper.addPromptDelays(minimalSmsAndEmailOptions, 1, 0),
  ]);

  await shownPromise;
  await closedPromise;
  const pushDismissed =    await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNotificationPrompt);
  const nonPushDismissed = await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNonPushPrompt);

  t.is(eventsHelper.eventCounts.shown, 1);
  t.is(dismissSpy.callCount, 1);
  t.is(pushDismissed, null);
  t.is(nonPushDismissed, "dismissed");
});

test("on non-push slidedown dismiss, dismissed slidedown cannot be reshown programmatically", async t => {
  await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
  sinonSandbox.stub(SlidedownManager.prototype as any, "checkIfSlidedownShouldBeShown").resolves(true);
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const dismissSpy = sinonSandbox.spy(DismissHelper, "markPromptDismissedWithType");
  EventsTestHelper.simulateSlidedownDismissAfterShown();

  const shownPromise = eventsHelper.getShownPromiseWithEventCounts(1);
  const closedPromise = eventsHelper.getClosedPromiseWithEventCounts();

  await testHelper.initWithPromptOptions([
      testHelper.addPromptDelays(minimalSmsAndEmailOptions, 1, 0),
  ]);

  await shownPromise;
  await closedPromise;
  const pushDismissed =    await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNotificationPrompt);
  const nonPushDismissed = await TimedLocalStorage.getItem(DismissTimeKey.OneSignalNonPushPrompt);

  OneSignal.showSmsAndEmailSlidedown();

  t.is(eventsHelper.eventCounts.shown, 1);
  t.is(dismissSpy.callCount, 1);
  t.is(pushDismissed, null);
  t.is(nonPushDismissed, "dismissed");
});

test("if subscribed w/ expired dismiss value, category slidedown doesn't prompt", async t => {
  await TestEnvironment.setupOneSignalPageWithStubs(sinonSandbox, testConfig, t);
  const eventsHelper = new EventsTestHelper(sinonSandbox);
  const slidedownCreateSpy = sinonSandbox.spy(Slidedown.prototype, "create");
  EventsTestHelper.simulateSlidedownAllowAfterShown();
  eventsHelper.simulateSubscribingAfterNativeAllow();

  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();

  // initialize
  await testHelper.initWithPromptOptions([
      testHelper.addPromptDelays(minimalCategorySlidedownOptions, 1, 0),
  ]);

  await subscriptionPromise;
  t.is(slidedownCreateSpy.callCount, 1);

  // simulate timed storage value expiration
  TimedLocalStorage.removeItem(DismissTimeKey.OneSignalNotificationPrompt);

  const options: AutoPromptOptions = { slidedownPromptOptions: minimalCategorySlidedownOptions };

  // should fail to successfully create slidedown since already subscribed and not in update mode
  await OneSignal.context.slidedownManager.createSlidedown(options);

  t.is(slidedownCreateSpy.callCount, 1); // unchanged

  sinonSandbox.stub(SlidedownManager.prototype, "handleAllowClick");
  await OneSignal.showCategorySlidedown(); // isInUpdateMode = true

  t.is(slidedownCreateSpy.callCount, 2);
});
