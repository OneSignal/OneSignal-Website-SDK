import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { AppUserConfigCustomLinkOptions } from '../../../src/shared/models/Prompts';
import { ResourceLoadState } from '../../../src/page/services/DynamicResourceLoader';
import { hasCssClass } from '../../../src/shared/utils/utils';
import { DismissHelper } from '../../../src/shared/helpers/DismissHelper';
import {
  CUSTOM_LINK_CSS_CLASSES,
  CUSTOM_LINK_CSS_SELECTORS,
} from '../../../src/shared/slidedown/constants';
import { CustomLinkManager } from '../../../src/shared/managers/CustomLinkManager';
import EventsTestHelper from '../../support/tester/EventsTestHelper';
import { simulateEventOfTypeOnElement } from '../../support/tester/utils';
import NotificationsNamespace from '../../../src/onesignal/NotificationsNamespace';

const sandbox: SinonSandbox = sinon.sandbox.create();
let config: AppUserConfigCustomLinkOptions;

const setSubscriptionStub = async function () {
  await EventsTestHelper.simulateSubscriptionChanged(true);
};

test.beforeEach(async () => {
  config = {
    enabled: true,
    style: 'button',
    size: 'small',
    color: {
      button: '#000000',
      text: '#ffffff',
    },
    text: {
      subscribe: "Let's do it",
      unsubscribe: "I don't want it anymore",
      explanation: 'Wanna stay in touch?',
    },
    unsubscribeEnabled: true,
  };

  await TestEnvironment.initialize({
    addPrompts: true,
  });
  TestEnvironment.mockInternalOneSignal();
  sandbox
    .stub(OneSignal.context.dynamicResourceLoader, 'loadSdkStylesheet')
    .returns(ResourceLoadState.Loaded);
});

test.afterEach(function () {
  sandbox.restore();
});

test('customlink: container: not render if disabled', async (t) => {
  config = {
    enabled: false,
  };
  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.containerSelector,
  );
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => t.is(el.children.length, 0));
});

test('customlink: container: render if enabled, explanation present', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.containerSelector,
  );
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.children.length, 2);
    t.is(
      hasCssClass(el.children[0], CUSTOM_LINK_CSS_CLASSES.explanationClass),
      true,
    );
    t.is(
      hasCssClass(el.children[1], CUSTOM_LINK_CSS_CLASSES.subscribeClass),
      true,
    );
  });
});

test('customlink: container: render if enabled, no explanation', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  config.text.explanation = '';
  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.containerSelector,
  );
  t.is(containerElements.length, 2);
  containerElements.forEach((el: HTMLElement) => {
    t.is(el.children.length, 1);
    t.is(
      hasCssClass(el.children[0], CUSTOM_LINK_CSS_CLASSES.subscribeClass),
      true,
    );
  });
});

test('customlink: push enabled text and state', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  const manager = new CustomLinkManager(config);
  await manager.initialize();
  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.unsubscribe);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.state.subscribed), true);
  });
});

test('customlink: push disabled text and state', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(false);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(el.textContent, config.text.subscribe);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.state.unsubscribed), true);
  });
});

test('customlink: subscribe: intitialized, push enabled', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.subscribeClass), true);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.resetClass), true);
    t.is(hasCssClass(el, config.size.toString()), true);
  });
});

test('customlink: subscribe: intitialized, push disabled', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(false);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.subscribeClass), true);
    t.is(hasCssClass(el, CUSTOM_LINK_CSS_CLASSES.resetClass), true);
    t.is(hasCssClass(el, config.size.toString()), true);
  });
});

test('customlink: subscribe: unsubscribe disabled', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  config.unsubscribeEnabled = false;
  await new CustomLinkManager(config).initialize();

  const containerElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.containerSelector,
  );
  containerElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, 'hide'), true);
  });
});

test('customlink: subscribe: unsubscribe enabled', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, 'hide'), false);
  });

  const explanationElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.explanationSelector,
  );
  explanationElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, 'hide'), false);
  });
});

test('customlink: subscribe: button', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  config.style = 'button';
  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  t.is(subscribeElements.length, 2);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, config.style.toString()), true);
    t.is(el.style.backgroundColor, 'rgb(0, 0, 0)');
    t.is(el.style.color, 'rgb(255, 255, 255)');
  });
});

test('customlink: subscribe: link', async (t) => {
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  config.style = 'link';
  await new CustomLinkManager(config).initialize();

  const subscribeElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  t.is(subscribeElements.length, 2);
  subscribeElements.forEach((el: HTMLElement) => {
    t.is(hasCssClass(el, config.style.toString()), true);
    t.not(el.style.backgroundColor, 'rgb(0, 0, 0)');
    t.is(el.style.color, 'rgb(255, 255, 255)');
  });
});

test('customlink: reinitialize', async (t) => {
  sandbox.stub(OneSignal, 'privateIsPushNotificationsEnabled').resolves(false);
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(false);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  await new CustomLinkManager(config).initialize();
  await new CustomLinkManager(config).initialize();
  const containerElements = document.querySelectorAll<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.containerSelector,
  );
  t.is(containerElements.length, 2);
});

test('customlink: subscribe: clicked: subscribed -> unsubscribed', async (t) => {
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  new EventsTestHelper(sandbox).simulateSubscribingAfterNativeAllow();
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(true);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  const subscriptionSpy = sandbox
    .stub(NotificationsNamespace.prototype, 'disable')
    .callsFake(async () => {
      await setSubscriptionStub();
    });
  sandbox
    .stub(OneSignal.context.subscriptionManager, 'getSubscriptionState')
    .returns({
      subscribed: true,
      optedOut: false,
    });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  const explanationElement = document.querySelector<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.explanationSelector,
  );
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement('click', subscribeElement);
    await subscriptionPromise;

    t.is(subscriptionSpy.calledOnce, true);
    t.is(subscriptionSpy.getCall(0).args.length, 1);
    t.is(subscriptionSpy.getCall(0).args[0], true);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. opted out', async (t) => {
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(false);
  const subscriptionSpy = sandbox
    .stub(NotificationsNamespace.prototype, 'disable')
    .callsFake(async () => {
      await setSubscriptionStub();
    });
  // TODO: why is this called in custom link
  sandbox.stub(DismissHelper, 'wasPromptOfTypeDismissed').returns(false);
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(true);
  sandbox
    .stub(OneSignal.context.subscriptionManager, 'getSubscriptionState')
    .returns({
      subscribed: true,
      optedOut: true,
    });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  const explanationElement = document.querySelector<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.explanationSelector,
  );
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement('click', subscribeElement);
    await subscriptionPromise;

    t.is(subscriptionSpy.calledOnce, true);
    t.is(subscriptionSpy.getCall(0).args.length, 1);
    t.is(subscriptionSpy.getCall(0).args[0], false);
  }
});

test('customlink: subscribe: clicked: unsubscribed -> subscribed. https. never subscribed.', async (t) => {
  TestEnvironment.overrideEnvironmentInfo({ requiresUserInteraction: false });
  const subscriptionPromise = EventsTestHelper.getSubscriptionPromise();
  sandbox.stub(CustomLinkManager, 'isPushEnabled').returns(false);
  const subscriptionSpy = sandbox
    .stub(OneSignal, 'registerForPushNotifications')
    .callsFake(async () => {
      await setSubscriptionStub();
    });
  sandbox.stub(CustomLinkManager, 'isOptedOut').returns(false);

  sandbox
    .stub(OneSignal.context.subscriptionManager, 'getSubscriptionState')
    .returns({
      subscribed: false,
      optedOut: false,
    });

  await new CustomLinkManager(config).initialize();
  const subscribeElement = document.querySelector<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.subscribeSelector,
  );
  const explanationElement = document.querySelector<HTMLElement>(
    CUSTOM_LINK_CSS_SELECTORS.explanationSelector,
  );
  t.not(subscribeElement, null);
  t.not(explanationElement, null);

  if (subscribeElement && explanationElement) {
    simulateEventOfTypeOnElement('click', subscribeElement);
    await subscriptionPromise;
    t.is(subscriptionSpy.calledOnce, true);
  }
});
