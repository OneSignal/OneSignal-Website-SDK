import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { AppUserConfigCustomLinkOptions } from '../../../src/models/AppConfig';
import CustomLink from '../../../src/CustomLink';
import Utils from '../../../src/utils/Utils';
import { ResourceLoadState } from '../../../src/services/DynamicResourceLoader';
import { hasCssClass } from '../../../src/utils';

let sandbox: SinonSandbox;
let config: AppUserConfigCustomLinkOptions;

const stateSubscribedClass = "state-subscribed";
const stateUnsubscribedClass = "state-unsubscribed";

test.beforeEach(async () => {
  sandbox = sinon.sandbox.create();
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.unsubscribe);
    t.is(hasCssClass(el, stateSubscribedClass), true);
  });
});

test('customlink: push disabled text and state', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.is(hasCssClass(el, stateUnsubscribedClass), true);
  });
});

test('customlink: subscribe: intitialized, push enabled', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CustomLink.subscribeClass), true);
    t.is(hasCssClass(el, CustomLink.resetClass), true);
    t.is(hasCssClass(el, config.size), true);
    t.is(el.getAttribute(CustomLink.initializedAttribute), "true");
    t.is(el.getAttribute(CustomLink.subscribeTextAttribute), config.text.subscribe);
    t.is(el.getAttribute(CustomLink.unsubscribeTextAttribute), config.text.unsubscribe);
    t.is(el.getAttribute(CustomLink.subscriptionStateAttribute), "true");
  });
});

test('customlink: subscribe: intitialized, push disabled', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);
  await CustomLink.initialize(config);

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CustomLink.subscribeClass), true);
    t.is(hasCssClass(el, CustomLink.resetClass), true);
    t.is(hasCssClass(el, config.size), true);
    t.is(el.getAttribute(CustomLink.initializedAttribute), "true");
    t.is(el.getAttribute(CustomLink.subscribeTextAttribute), config.text.subscribe);
    t.is(el.getAttribute(CustomLink.unsubscribeTextAttribute), config.text.unsubscribe);
    t.is(el.getAttribute(CustomLink.subscriptionStateAttribute), "false");
  });
});

test('customlink: subscribe: unsubscribe disabled', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
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
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);
  await CustomLink.initialize(config);
  await CustomLink.initialize(config);
  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
});

test('customlink: subscribe: clicked: subscribed -> unsubscribed', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);
  sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(Utils, 'isUsingSubscriptionWorkaround').returns(false);
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
    t.is(subscribeElement.textContent, config.text.unsubscribe);
    t.is(hasCssClass(subscribeElement, stateSubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateSubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "true");

    await CustomLink.handleClick(subscribeElement);

    t.is(subscribeElement.textContent, config.text.subscribe);
    t.is(hasCssClass(subscribeElement, stateUnsubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateUnsubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. opted out', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(OneSignal, 'registerForPushNotifications').resolves();
  sandbox.stub(Utils, 'isUsingSubscriptionWorkaround').returns(false);
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
    t.is(subscribeElement.textContent, config.text.subscribe);
    t.is(hasCssClass(subscribeElement, stateUnsubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateUnsubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");

    await CustomLink.handleClick(subscribeElement);

    t.is(subscribeElement.textContent, config.text.unsubscribe);
    t.is(hasCssClass(subscribeElement, stateSubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateSubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "true");
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. never subscribed.', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(OneSignal, 'registerForPushNotifications').resolves();
  sandbox.stub(Utils, 'isUsingSubscriptionWorkaround').returns(false);
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
    t.is(subscribeElement.textContent, config.text.subscribe);
    t.is(hasCssClass(subscribeElement, stateUnsubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateUnsubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");

    await CustomLink.handleClick(subscribeElement);

    t.is(subscribeElement.textContent, config.text.unsubscribe);
    t.is(hasCssClass(subscribeElement, stateSubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateSubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "true");
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. http.', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);
  sandbox.stub(OneSignal, 'setSubscription').resolves();
  sandbox.stub(OneSignal, 'registerForPushNotifications').resolves();
  sandbox.stub(Utils, 'isUsingSubscriptionWorkaround').returns(true);

  await CustomLink.initialize(config);
  const subscribeElement = document.querySelector<HTMLElement>(CustomLink.subscribeSelector);
  const explanationElement = document.querySelector<HTMLElement>(CustomLink.explanationSelector);
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    t.is(subscribeElement.textContent, config.text.subscribe);
    t.is(hasCssClass(subscribeElement, stateUnsubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateUnsubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "false");

    await CustomLink.handleClick(subscribeElement);

    t.is(subscribeElement.textContent, config.text.unsubscribe);
    t.is(hasCssClass(subscribeElement, stateSubscribedClass), true);
    t.is(hasCssClass(explanationElement, stateSubscribedClass), true);
    t.is(subscribeElement.getAttribute(CustomLink.subscriptionStateAttribute), "true");
  }
});
