import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { AppUserConfigCustomLinkOptions } from '../../../src/models/Prompts';
import OneSignalUtils from '../../../src/utils/OneSignalUtils';
import { ResourceLoadState } from '../../../src/services/DynamicResourceLoader';
import { hasCssClass } from '../../../src/utils';
import { DismissHelper } from '../../../src/helpers/DismissHelper';
import { CUSTOM_LINK_CSS_CLASSES, CUSTOM_LINK_CSS_SELECTORS } from '../../../src/slidedown/constants';
import { CustomLinkManager } from '../../../src/managers/CustomLinkManager';
import EventsTestHelper from '../../support/tester/EventsTestHelper';
import { simulateEventOfTypeOnElement } from '../../support/tester/utils';
import PermissionManager from '../../../src/managers/PermissionManager';

const sandbox: SinonSandbox = sinon.sandbox.create();
let config: AppUserConfigCustomLinkOptions;

const setSubscriptionStub = async function() {
  await EventsTestHelper.simulateSubscriptionChanged(true);
};

test.beforeEach(async () => {
  config = {
    enabled: true,
    style: "button",
    size: "small",
    color: {
      button: "#000000",
      text: "#ffffff",
    },
    text: {
      subscribe: "Let's do it",
      unsubscribe: "I don't want it anymore",
      explanation: "Wanna stay in touch?",
    },
    unsubscribeEnabled: true,
  };

  await TestEnvironment.initialize({
    addPrompts: true,
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  TestEnvironment.mockInternalOneSignal();
  sandbox.stub(OneSignal.context.dynamicResourceLoader, 'loadSdkStylesheet')
    .returns(ResourceLoadState.Loaded);
});

test.afterEach(function () {
  sandbox.restore();
});

test('customlink: container: not render if disabled', async t => {
  config = {
    enabled: false,
  };
  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.children.length, 0));
});

test('customlink: container: render if enabled, explanation present', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.children.length, 2);
    t.is(hasCssClass(el.children[0], CUSTOM_LINK_CSS_CLASSES.explanationClass), true);
    t.is(hasCssClass(el.children[1], CUSTOM_LINK_CSS_CLASSES.subscribeClass), true);
  });
});

test('customlink: container: render if enabled, no explanation', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  config.text.explanation = "";
  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.children.length, 1);
    t.is(hasCssClass(el.children[0], CUSTOM_LINK_CSS_CLASSES.subscribeClass), true);
  });
});

test("customlink: push enabled text and state", async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").returns(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  const manager = new CustomLinkManager(config);
  await manager.initialize();
  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.unsubscribe);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.state.subscribed), true);
  });
});

test('customlink: push disabled text and state', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.state.unsubscribed), true);
  });
});

test('customlink: subscribe: intitialized, push enabled', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.subscribeClass), true);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.resetClass), true);
    t.is(hasCssClass(el, config.size.toString()), true);
  });
});

test('customlink: subscribe: intitialized, push disabled', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.subscribeClass), true);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.resetClass), true);
    t.is(hasCssClass(el, config.size.toString()), true);
  });
});

test('customlink: subscribe: unsubscribe disabled', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  config.unsubscribeEnabled = false;
  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.containerSelector);
  containerElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), true);
  });
});

test('customlink: subscribe: unsubscribe enabled', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), false);
  });

  const explanationElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.explanationSelector);
  explanationElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), false);
  });
});

test('customlink: subscribe: button', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  config.style = "button";
  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  t.is(subscribeElements.length, 2);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, config.style.toString()), true);
    t.is(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });
});

test('customlink: subscribe: link', async t => {
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  config.style = "link";
  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  t.is(subscribeElements.length, 2);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, config.style.toString()), true);
    t.not(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });
});

test('customlink: reinitialize', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  await new CustomLinkManager(config).initialize();
  await new CustomLinkManager(config).initialize();
  const containerElements = document.querySelectorAll<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.containerSelector);
  t.is(containerElements.length, 2);
});

test('customlink: subscribe: clicked: subscribed -> unsubscribed', async t => {
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  new EventsTestHelper(sandbox).simulateSubscribingAfterNativeAllow();
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  const subscriptionSpy = sandbox.stub(OneSignal, 'setSubscription').callsFake(async () => {
    await setSubscriptionStub();
  });
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  sandbox.stub(OneSignal.context.subscriptionManager, 'getSubscriptionState').returns({
    subscribed: true,
    optedOut: false,
  });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement("click", subscribeElement);
    await subscriptionPromise;

    t.is(subscriptionSpy.calledOnce, true);
    t.is(subscriptionSpy.getCall(0).args.length, 1);
    t.is(subscriptionSpy.getCall(0).args[0], false);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. opted out', async t => {
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  const subscriptionSpy = sandbox.stub(OneSignal, 'setSubscription').callsFake(async () => {
    await setSubscriptionStub();
  });
  // TODO: why is this called in custom link
  sandbox.stub(DismissHelper, 'wasPromptOfTypeDismissed').returns(false);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(true);
  sandbox.stub(OneSignal.context.subscriptionManager, 'getSubscriptionState').returns({
    subscribed: true,
    optedOut: true,
  });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement("click", subscribeElement);
    await subscriptionPromise;

    t.is(subscriptionSpy.calledOnce, true);
    t.is(subscriptionSpy.getCall(0).args.length, 1);
    t.is(subscriptionSpy.getCall(0).args[0], true);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. never subscribed.', async t => {
  TestEnvironment.overrideEnvironmentInfo({ requiresUserInteraction: false });
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  const subscriptionSpy = sandbox.stub(OneSignal, 'registerForPushNotifications').callsFake(async () => {
    await setSubscriptionStub();
  });
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);

  sandbox.stub(OneSignal.context.subscriptionManager, 'getSubscriptionState').returns({
    subscribed: false,
    optedOut: false,
  });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement("click", subscribeElement);
    await subscriptionPromise;
    t.is(subscriptionSpy.calledOnce, true);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. http. never subscribed.', async t => {
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  TestEnvironment.overrideEnvironmentInfo({ requiresUserInteraction: false });
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  const registerSpy = sandbox.stub(OneSignal, 'registerForPushNotifications').callsFake(async () => {
    await setSubscriptionStub();
  });
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(true);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(false);


  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement("click", subscribeElement);
    await subscriptionPromise;

    t.is(registerSpy.calledOnce, true);
    t.is(registerSpy.getCall(0).args.length, 1);
    t.is(registerSpy.getCall(0).args[0].autoAccept, true);
  }
});


test('customlink: subscribe: clicked: unsubscribed -> subscribed. http. opted out.', async t => {
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  sandbox.stub(PermissionManager.prototype, 'getReportedNotificationPermission').resolves(false);
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(true);
  sandbox.stub(CustomLinkManager, "isPushEnabled").resolves(false);
  sandbox.stub(CustomLinkManager, "isOptedOut").resolves(true);
  const subscriptionSpy = sandbox.stub(OneSignal, 'setSubscription').callsFake(async () => {
    await setSubscriptionStub();
  });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CUSTOM_LINK_CSS_SELECTORS.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement("click", subscribeElement);
    await subscriptionPromise;

    t.is(subscriptionSpy.calledOnce, true);
  }
});
