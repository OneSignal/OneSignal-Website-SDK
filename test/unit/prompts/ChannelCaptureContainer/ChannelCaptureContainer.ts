import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment,
  HttpHttpsEnvironment,
  BrowserUserAgent,
  TestEnvironmentConfig } from '../../../support/sdk/TestEnvironment';
import { getDomElementOrStub } from '../../../../src/utils';
import {
  CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
  SLIDEDOWN_CSS_IDS
} from '../../../../src/slidedown/constants';
import ChannelCaptureContainer from '../../../../src/slidedown/ChannelCaptureContainer';
import { SlidedownPromptingTestHelper } from '../SlidedownPrompting/_SlidedownPromptingTestHelpers';
import { DelayedPromptType } from '../../../../src/models/Prompts';
import { ChannelCaptureContainerHelper } from './_ChannelCaptureContainerHelper';
import EventsTestHelper from '../../../support/tester/EventsTestHelper';
import { ConfigIntegrationKind } from '../../../../src/models/AppConfig';
import { NotificationPermission } from '../../../../src/models/NotificationPermission';
import Slidedown from '../../../../src/slidedown/Slidedown';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  (global as any).location = new URL("https://localhost:4001");
  const userConfig = TestEnvironment.getFakeMergedConfig({});
  const options = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    initOptions: userConfig,
    addPrompts: true
  };
  await TestEnvironment.stubDomEnvironment(options);
  await TestEnvironment.initialize(options);
});

test.afterEach(function () {
  sandbox.restore();
});

const testHelper = new SlidedownPromptingTestHelper(sandbox);
const minimalSmsAndEmailOptions = testHelper.getMinimalSmsAndEmailOptions();
const minimalEmailSlidedownOptions = testHelper.getMinimalEmailOptions();

test("check that calling mount() adds the capture container to DOM", async t => {
  ChannelCaptureContainerHelper.setupStubs(sandbox);
  const captureContainer = new ChannelCaptureContainer(minimalSmsAndEmailOptions);
  let containerFromDom = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer}`);
  t.not(containerFromDom.id, CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer);

  await captureContainer.mount();

  containerFromDom = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer}`);
  t.is(containerFromDom.id, CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer);
});

test("sms & email validation is hidden by default", async t => {
  ChannelCaptureContainerHelper.setupStubs(sandbox);

  const captureContainer = new ChannelCaptureContainer(minimalSmsAndEmailOptions);
  await captureContainer.mount();

  t.false(ChannelCaptureContainerHelper.isEmailValidationElementShowing());
  t.false(ChannelCaptureContainerHelper.isSmsValidationElementShowing());
});

test("resetting validation styles works correctly", async t => {
  ChannelCaptureContainerHelper.setupStubs(sandbox);

  const captureContainer = new ChannelCaptureContainer(minimalSmsAndEmailOptions);
  await captureContainer.mount();

  ChannelCaptureContainer.showSmsInputError(true);
  ChannelCaptureContainer.showEmailInputError(true);

  ChannelCaptureContainer.resetInputErrorStates(DelayedPromptType.SmsAndEmail);

  t.false(ChannelCaptureContainerHelper.isEmailValidationElementShowing());
  t.false(ChannelCaptureContainerHelper.isSmsValidationElementShowing());
});

const testConfig: TestEnvironmentConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    integration: ConfigIntegrationKind.Custom,
    permission: NotificationPermission.Default,
    pushIdentifier: 'granted',
    stubSetTimeout: true
};

test("submit email with bad input throws error and shows validation message", async t => {
  await TestEnvironment.setupOneSignalPageWithStubs(sandbox, testConfig, t);
  const eventsHelper = new EventsTestHelper(sandbox);
  const slidedownShownPromise = eventsHelper.getShownPromiseWithEventCounts();
  const setFailureStateSpy = sandbox.stub(Slidedown.prototype, "setFailureState");
  const slidedownCloseSpy  = sandbox.stub(Slidedown.prototype, "close");

  await testHelper.initWithPromptOptions([
      testHelper.addPromptDelays(minimalEmailSlidedownOptions, 1, 0),
  ]);

  await slidedownShownPromise;

  // simulate typing in an valid email
  testHelper.inputEmail("rodrigo@com");
  const emailInput = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`);
  const emailInputKeyupEvent = document.createEvent("Event");
  emailInputKeyupEvent.initEvent('keyup', true, true);
  emailInput.dispatchEvent(emailInputKeyupEvent);

  // simulate trying to click allow button
  const acceptButtonElem = document.querySelector(
    `#${SLIDEDOWN_CSS_IDS.allowButton}`
  );
  const allowClickEvent = document.createEvent("Event");
  allowClickEvent.initEvent('click', true, true);
  acceptButtonElem?.dispatchEvent(allowClickEvent);

  t.true(ChannelCaptureContainerHelper.isEmailValidationElementShowing());
  t.true(setFailureStateSpy.calledOnce);
  t.false(slidedownCloseSpy.called);
});

/* note: above test wasn't implemented similarly for sms since validation ocurrs at the 3rd party SDK level via ITI*/

test("email validation works correctly", t => {
  t.true(ChannelCaptureContainer.validateEmailInputWithReturnVal("email@example.com"));
  t.true(ChannelCaptureContainer.validateEmailInputWithReturnVal("firstname.lastname@example.com"));
  t.true(ChannelCaptureContainer.validateEmailInputWithReturnVal("email@subdomain.example.com"));
  t.true(ChannelCaptureContainer.validateEmailInputWithReturnVal("firstname+lastname@example.com"));
  t.true(ChannelCaptureContainer.validateEmailInputWithReturnVal("email@123.123.123.123"));
  t.true(ChannelCaptureContainer.validateEmailInputWithReturnVal("firstname-lastname@example.com"));

  t.false(ChannelCaptureContainer.validateEmailInputWithReturnVal("#@%^%#$@#$@#.com"));
  t.false(ChannelCaptureContainer.validateEmailInputWithReturnVal("@example.com"));
  t.false(ChannelCaptureContainer.validateEmailInputWithReturnVal("email@example@example.com"));
  t.false(ChannelCaptureContainer.validateEmailInputWithReturnVal("email@-example.com"));
});
