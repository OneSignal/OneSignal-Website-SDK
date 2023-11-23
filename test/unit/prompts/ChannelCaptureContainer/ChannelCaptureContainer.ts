import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import {
  TestEnvironment,
  BrowserUserAgent,
  TestEnvironmentConfig,
} from '../../../support/sdk/TestEnvironment';
import { getDomElementOrStub } from '../../../../src/shared/utils/utils';
import {
  CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
  SLIDEDOWN_CSS_IDS,
} from '../../../../src/shared/slidedown/constants';
import ChannelCaptureContainer from '../../../../src/page/slidedown/ChannelCaptureContainer';
import { SlidedownPromptingTestHelper } from '../SlidedownPrompting/_SlidedownPromptingTestHelpers';
import { ChannelCaptureContainerHelper } from './_ChannelCaptureContainerHelper';
import EventsTestHelper from '../../../support/tester/EventsTestHelper';
import { ConfigIntegrationKind } from '../../../../src/shared/models/AppConfig';
import { NotificationPermission } from '../../../../src/shared/models/NotificationPermission';
import Slidedown from '../../../../src/page/slidedown/Slidedown';
import { simulateEventOfTypeOnElement } from '../../../support/tester/utils';
import { DelayedPromptType } from '../../../../src/shared/models/Prompts';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  (global as any).location = new URL('https://localhost:4001');
  const userConfig = TestEnvironment.getFakeMergedConfig({});
  const options = {
    initOptions: userConfig,
    addPrompts: true,
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

test('check that calling mount() adds the capture container to DOM', async (t) => {
  ChannelCaptureContainerHelper.setupStubs(sandbox);
  const captureContainer = new ChannelCaptureContainer(
    minimalSmsAndEmailOptions,
  );
  let containerFromDom = getDomElementOrStub(
    `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer}`,
  );
  t.not(
    containerFromDom.id,
    CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer,
  );

  await captureContainer.mount();

  containerFromDom = getDomElementOrStub(
    `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer}`,
  );
  t.is(
    containerFromDom.id,
    CHANNEL_CAPTURE_CONTAINER_CSS_IDS.channelCaptureContainer,
  );
});

test('sms & email validation is hidden by default', async (t) => {
  ChannelCaptureContainerHelper.setupStubs(sandbox);

  const captureContainer = new ChannelCaptureContainer(
    minimalSmsAndEmailOptions,
  );
  await captureContainer.mount();

  t.false(ChannelCaptureContainerHelper.isEmailValidationElementShowing());
  t.false(ChannelCaptureContainerHelper.isSmsValidationElementShowing());
});

test('resetting validation styles works correctly', async (t) => {
  ChannelCaptureContainerHelper.setupStubs(sandbox);

  const captureContainer = new ChannelCaptureContainer(
    minimalSmsAndEmailOptions,
  );
  await captureContainer.mount();

  ChannelCaptureContainer.showSmsInputError(true);
  ChannelCaptureContainer.showEmailInputError(true);

  ChannelCaptureContainer.resetInputErrorStates(DelayedPromptType.SmsAndEmail);

  t.false(ChannelCaptureContainerHelper.isEmailValidationElementShowing());
  t.false(ChannelCaptureContainerHelper.isSmsValidationElementShowing());
});

const testConfig: TestEnvironmentConfig = {
  integration: ConfigIntegrationKind.Custom,
  permission: NotificationPermission.Default,
  pushIdentifier: 'granted',
  stubSetTimeout: true,
};

test('submit email with bad input throws error and shows validation message', async (t) => {
  await TestEnvironment.setupOneSignalPageWithStubs(sandbox, testConfig, t);
  const eventsHelper = new EventsTestHelper(sandbox);
  const slidedownShownPromise = eventsHelper.getShownPromiseWithEventCounts();
  const allowClickHandlingPromise = eventsHelper.getAllowClickHandlingPromise();
  const setFailureStateStub = sandbox.stub(
    Slidedown.prototype,
    'setFailureState',
  );
  const slidedownCloseSpy = sandbox.spy(Slidedown.prototype, 'close');

  await testHelper.initWithPromptOptions([
    testHelper.addPromptDelays(minimalEmailSlidedownOptions, 1, 0),
  ]);

  await slidedownShownPromise;

  // simulate typing in an valid email
  testHelper.inputEmail('rodrigo@com');
  const emailInput = getDomElementOrStub(
    `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`,
  );
  simulateEventOfTypeOnElement('keyup', emailInput);

  // simulate trying to click allow button
  const acceptButtonElem = document.querySelector(
    `#${SLIDEDOWN_CSS_IDS.allowButton}`,
  );
  simulateEventOfTypeOnElement('click', acceptButtonElem);

  await allowClickHandlingPromise;

  t.true(setFailureStateStub.calledOnce);
  t.false(slidedownCloseSpy.called);
  t.true(ChannelCaptureContainerHelper.isEmailValidationElementShowing());
});

/* note: above test wasn't implemented similarly for sms since validation ocurrs at the 3rd party SDK level via ITI*/

test('email validation works correctly', (t) => {
  t.true(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'email@example.com',
    ),
  );
  t.true(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'firstname.lastname@example.com',
    ),
  );
  t.true(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'email@subdomain.example.com',
    ),
  );
  t.true(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'firstname+lastname@example.com',
    ),
  );
  t.true(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'email@123.123.123.123',
    ),
  );
  t.true(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'firstname-lastname@example.com',
    ),
  );

  t.false(
    ChannelCaptureContainer.validateEmailInputWithReturnVal('#@%^%#$@#$@#.com'),
  );
  t.false(
    ChannelCaptureContainer.validateEmailInputWithReturnVal('@example.com'),
  );
  t.false(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'email@example@example.com',
    ),
  );
  t.false(
    ChannelCaptureContainer.validateEmailInputWithReturnVal(
      'email@-example.com',
    ),
  );
});
