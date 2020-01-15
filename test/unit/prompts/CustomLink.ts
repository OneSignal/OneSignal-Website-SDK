import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { AppUserConfigCustomLinkOptions } from '../../../src/models/AppConfig';
import CustomLink from '../../../src/CustomLink';
import OneSignalUtils from '../../../src/utils/OneSignalUtils';
import { ResourceLoadState } from '../../../src/services/DynamicResourceLoader';
import { hasCssClass } from '../../../src/utils';
import MainHelper from "../../../src/helpers/MainHelper";
import OneSignal from "../../../src/OneSignal"

let sandbox: SinonSandbox = sinon.sandbox.create();;
let config: AppUserConfigCustomLinkOptions;

const stateSubscribedClass = "state-subscribed";
const stateUnsubscribedClass = "state-unsubscribed";

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
  await CustomLink.initialize(config);

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.children.length, 0));
});

test('customlink: container: render if enabled, explanation present', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.children.length, 2);
    t.is(hasCssClass(el.children[0], CustomLink.explanationClass), true);
    t.is(hasCssClass(el.children[1], CustomLink.subscribeClass), true);
  });
});

test('customlink: container: render if enabled, no explanation', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  config.text.explanation = "";
  await CustomLink.initialize(config);

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.children.length, 1);
    t.is(hasCssClass(el.children[0], CustomLink.subscribeClass), true);
  });
});

test('customlink: push enabled text and state', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.unsubscribe);
    t.is(hasCssClass(el, stateSubscribedClass), true);
  });
});

test('customlink: push disabled text and state', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.is(hasCssClass(el, stateUnsubscribedClass), true);
  });
});

test('customlink: subscribe: intitialized, push enabled', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CustomLink.subscribeClass), true);
    t.is(hasCssClass(el, CustomLink.resetClass), true);
    t.is(hasCssClass(el, config.size.toString()), true);
    t.is(el.getAttribute(CustomLink.initializedAttribute), "true");
    t.is(el.getAttribute(CustomLink.subscriptionStateAttribute), "true");
  });
});

test('customlink: subscribe: intitialized, push disabled', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CustomLink.subscribeClass), true);
    t.is(hasCssClass(el, CustomLink.resetClass), true);
    t.is(hasCssClass(el, config.size.toString()), true);
    t.is(el.getAttribute(CustomLink.initializedAttribute), "true");
    t.is(el.getAttribute(CustomLink.subscriptionStateAttribute), "false");
  });
});

test('customlink: subscribe: unsubscribe disabled', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  config.unsubscribeEnabled = false;
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), true);
  });

  const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
  explanationElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), true);
  });
});

test('customlink: subscribe: unsubscribe enabled', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), false);
  });

  const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
  explanationElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, "hide"), false);
  });
});

test('customlink: subscribe: button', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  config.style = "button";
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  t.is(subscribeElements.length, 3);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, config.style.toString()), true);
    t.is(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });
});

test('customlink: subscribe: link', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  config.style = "link";
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  t.is(subscribeElements.length, 3);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, config.style.toString()), true);
    t.not(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });
});

test('customlink: reinitialize', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  await CustomLink.initialize(config);
  await CustomLink.initialize(config);
  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
});

test('customlink: subscribe: clicked: subscribed -> unsubscribed', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  const subscriptionSpy = sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  sandbox.stub(OneSignal.context.subscriptionManager, 'getSubscriptionState').returns({
    subscribed: true,
    optedOut: false,
  });

  await CustomLink.initialize(config);
  const subscribeElement = document.querySelector<HTMLElement>(CustomLink.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CustomLink.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "true");
    await CustomLink.handleClick(subscribeElement);
    t.is(subscriptionSpy.calledOnce, true);
    t.is(subscriptionSpy.getCall(0).args.length, 1);
    t.is(subscriptionSpy.getCall(0).args[0], false);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. opted out', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  const subscriptionSpy = sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  // TODO: why is this called in custom link
  sandbox.stub(MainHelper, 'wasHttpsNativePromptDismissed').returns(false);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, 'getSubscriptionState').returns({
    subscribed: true,
    optedOut: true,
  });

  await CustomLink.initialize(config);
  const subscribeElement = document.querySelector<HTMLElement>(CustomLink.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CustomLink.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");

    await CustomLink.handleClick(subscribeElement);

    t.is(subscriptionSpy.calledOnce, true);
    t.is(subscriptionSpy.getCall(0).args.length, 1);
    t.is(subscriptionSpy.getCall(0).args[0], true);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. never subscribed.', async t => {
  TestEnvironment.overrideEnvironmentInfo({requiresUserInteraction: false});
  
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);
  sandbox.stub(OneSignal, 'setSubscription').resolves();
  const registerSpy = sandbox.stub(OneSignal, 'registerForPushNotifications').resolves();
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  sandbox.stub(OneSignal.context.subscriptionManager, 'getSubscriptionState').returns({
    subscribed: false,
    optedOut: false,
  });

  await CustomLink.initialize(config);
  const subscribeElement = document.querySelector<HTMLElement>(CustomLink.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CustomLink.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");
    await CustomLink.handleClick(subscribeElement);
    t.is(registerSpy.calledOnce, true);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. http. never subscribed.', async t => {
  TestEnvironment.overrideEnvironmentInfo({requiresUserInteraction: false});
  
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'setSubscription').resolves();
  const registerSpy = sandbox.stub(OneSignal, 'registerForPushNotifications').resolves();
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').returns(false);

  await CustomLink.initialize(config);
  const subscribeElement = document.querySelector<HTMLElement>(CustomLink.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CustomLink.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");
    await CustomLink.handleClick(subscribeElement);
    t.is(registerSpy.calledOnce, true);
    t.is(registerSpy.getCall(0).args.length, 1);
    t.is(registerSpy.getCall(0).args[0].autoAccept, true);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. http. opted out.', async t => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').returns(false);
  const registerSpy = sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(true);
  sandbox.stub(OneSignal, 'internalIsOptedOut').resolves(true);

  await CustomLink.initialize(config);
  const subscribeElement = document.querySelector<HTMLElement>(CustomLink.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CustomLink.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");
    await CustomLink.handleClick(subscribeElement);
    t.is(registerSpy.calledOnce, true);
  }
});
