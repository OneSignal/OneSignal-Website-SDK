import { BASE_IDENTITY } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  createUserFn,
  getNotificationIcons,
  setCreateUserResponse,
} from '__test__/support/helpers/requests';
import {
  setupIdentityModel,
  setupLoadStylesheet,
} from '__test__/support/helpers/setup';
import { IDManager } from 'src/shared/managers/IDManager';
import { DelayedPromptType } from 'src/shared/prompts/constants';

beforeEach(async () => {
  await TestEnvironment.initialize({
    userConfig: config,
    initUserAndPushSubscription: true,
  });
  setupIdentityModel({ onesignalID: IDManager.createLocalId() });
  setupLoadStylesheet();
});

test('can show email slidedown', async () => {
  const addEmailSpy = vi.spyOn(OneSignal.User, 'addEmail');
  setCreateUserResponse();
  await OneSignal.Slidedown.promptEmail();

  expect(getMessageText()).toBe(message);

  const submitButton = getSubmitButton();
  const emailInput = getEmailInput();

  // should validate empty email
  expect(getEmailValidationMessage()).toBe('Please enter a valid email');
  expect(addEmailSpy).not.toHaveBeenCalled();

  // can add email subscription
  emailInput.value = 'test@test.com';
  submitButton.click();

  expect(addEmailSpy).toHaveBeenCalled();
  await vi.waitUntil(() => createUserFn.mock.calls.length > 0);
  expect(createUserFn).toHaveBeenCalledWith({
    identity: {},
    ...BASE_IDENTITY,
    subscriptions: [
      {
        device_model: '',
        device_os: '56',
        enabled: true,
        notification_types: 1,
        sdk: __VERSION__,
        token: 'test@test.com',
        type: 'Email',
      },
    ],
  });
});

// helpers
const getMessageText = () =>
  (document.querySelector('.slidedown-body-message') as HTMLElement)?.innerText;

const getSubmitButton = () =>
  document.querySelector(
    '#onesignal-slidedown-dialog button',
  ) as HTMLButtonElement;

const getEmailInput = () =>
  document.querySelector('#onesignal-email-input') as HTMLInputElement;

const getSmsInput = () =>
  document.querySelector('#iti-onesignal-sms-input') as HTMLInputElement;

const getEmailValidationMessage = () =>
  (
    document.querySelector('#onesignal-email-validation-element')
      ?.childNodes[1] as HTMLElement
  )?.innerText;

const getSmsValidationMessage = () =>
  (
    document.querySelector('#onesignal-sms-validation-element')
      ?.childNodes[1] as HTMLElement
  )?.innerText;

const message = 'Receive the latest news, updates and offers as they happen.';
getNotificationIcons();

const config = {
  promptOptions: {
    slidedown: {
      prompts: [
        {
          autoPrompt: true,
          text: {
            acceptButton: 'Submit',
            cancelButton: 'No Thanks',
            actionMessage: message,
            emailLabel: 'Email',
          },
          type: DelayedPromptType.Email,
        },
        {
          autoPrompt: true,
          text: {
            acceptButton: 'Submit',
            cancelButton: 'No Thanks',
            actionMessage: message,
            smsLabel: 'Phone Number',
          },
          type: DelayedPromptType.Sms,
        },
        {
          autoPrompt: true,
          text: {
            acceptButton: 'Submit',
            cancelButton: 'No Thanks',
            actionMessage: message,
            emailLabel: 'Email',
            smsLabel: 'Phone Number',
          },
          type: DelayedPromptType.SmsAndEmail,
        },
      ],
    },
  },
};
