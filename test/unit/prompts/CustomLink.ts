import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { AppUserConfigCustomLinkOptions } from '../../../src/models/AppConfig';
import CustomLink from '../../../src/CustomLink';
import { ResourceLoadState } from '../../../src/services/DynamicResourceLoader';

let sandbox: SinonSandbox;

const stateSubscribedClass = "state-subscribed";
const stateUnsubscribedClass = "state-unsubscribed";

test.beforeEach(async () => {
  sandbox = sinon.sandbox.create();

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

test('customlink: not render if disabled', async t => {
  const config: AppUserConfigCustomLinkOptions = {
    enabled: false,
    style: "link",
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
  await CustomLink.initialize(config);

  const containerElements = document.querySelectorAll(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.childNodes.length, 0));
});

test('customlink: render if enabled and all properties present, button style & push enabled', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);

  const config: AppUserConfigCustomLinkOptions = {
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
  await CustomLink.initialize(config);

  // Make sure that we advance in the initialization after css loaded
  const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
  t.is(sdkStylesLoadResult, ResourceLoadState.Loaded)

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.childNodes.length, 3)
    t.is(el.getAttribute(CustomLink.initializedAttribute), "1");
  });

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  t.is(subscribeElements.length, 3);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.subscribeClass, CustomLink.resetClass,
      stateSubscribedClass, config.style, config.size]);
    t.is(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });

  const unsubscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.unsubscribeSelector);
  t.is(unsubscribeElements.length, 2);
  unsubscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.unsubscribe);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.unsubscribeClass, CustomLink.resetClass,
      stateSubscribedClass, config.style, config.size]);
      t.is(el.style.backgroundColor, "rgb(0, 0, 0)");
      t.is(el.style.color, "rgb(255, 255, 255)");
  });

  const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
  t.is(explanationElements.length, 2);
  explanationElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.explanation);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.explanationClass, CustomLink.resetClass,
      stateSubscribedClass, config.size]);
  });
});

test('customlink: render if enabled and all properties present, link style & push disabled', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(false);

  const config: AppUserConfigCustomLinkOptions = {
    enabled: true,
    style: "link",
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
  await CustomLink.initialize(config);

  // Make sure that we advance in the initialization after css loaded
  const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
  t.is(sdkStylesLoadResult, ResourceLoadState.Loaded)

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.childNodes.length, 3));

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  t.is(subscribeElements.length, 3);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.subscribeClass, CustomLink.resetClass,
      stateUnsubscribedClass, config.style, config.size]);
    t.not(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });

  const unsubscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.unsubscribeSelector);
  t.is(unsubscribeElements.length, 2);
  unsubscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.unsubscribe);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.unsubscribeClass, CustomLink.resetClass,
        stateUnsubscribedClass, config.style, config.size]);
      t.not(el.style.backgroundColor, "rgb(0, 0, 0)");
      t.is(el.style.color, "rgb(255, 255, 255)");
  });

  const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
  t.is(explanationElements.length, 2);
  explanationElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.explanation);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.explanationClass, CustomLink.resetClass,
        stateUnsubscribedClass, config.size]);
  });
});

test('customlink: render if enabled and some properties present', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);

  const config: AppUserConfigCustomLinkOptions = {
    enabled: true,
    style: "button",
    size: "medium",
    color: {
      button: "#000000",
      text: "#ffffff",
    },
    text: {
      subscribe: "Let's do it",
      unsubscribe: "I don't want it anymore",
      explanation: "",
    },
    unsubscribeEnabled: false,
  };
  await CustomLink.initialize(config);

  // Make sure that we advance in the initialization after css loaded
  const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
  t.is(sdkStylesLoadResult, ResourceLoadState.Loaded)

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.childNodes.length, 1));

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  t.is(subscribeElements.length, 3);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.deepEqual(el.className.split(' '), 
      [CustomLink.subscribeClass, CustomLink.resetClass,
      stateSubscribedClass, config.style, config.size]);
    t.is(el.style.backgroundColor, "rgb(0, 0, 0)");
    t.is(el.style.color, "rgb(255, 255, 255)");
  });

  const unsubscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.unsubscribeSelector);
  t.is(unsubscribeElements.length, 0);

  const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
  t.is(explanationElements.length, 0);
});

test('customlink: re-initialize', async t => {
  sandbox.stub(OneSignal, 'isPushNotificationsEnabled').returns(true);

  const config: AppUserConfigCustomLinkOptions = {
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

  // Intentionally calling it twice
  await CustomLink.initialize(config);
  await CustomLink.initialize(config);

  // Make sure that we advance in the initialization after css loaded
  const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
  t.is(sdkStylesLoadResult, ResourceLoadState.Loaded)

  const containerElements = document.querySelectorAll<HTMLElement>(CustomLink.containerSelector);
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.childNodes.length, 3));

  const subscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.subscribeSelector);
  t.is(subscribeElements.length, 3);

  const unsubscribeElements = document.querySelectorAll<HTMLElement>(CustomLink.unsubscribeSelector);
  t.is(unsubscribeElements.length, 2);

  const explanationElements = document.querySelectorAll<HTMLElement>(CustomLink.explanationSelector);
  t.is(explanationElements.length, 2);
});
