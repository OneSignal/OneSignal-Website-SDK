import { BASE_IDENTITY, BASE_SUB, PUSH_TOKEN } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  createUserFn,
  getNotificationIcons,
  setCreateUserResponse,
  setUpdateUserResponse,
  updateUserFn,
} from '__test__/support/helpers/requests';
import {
  getRawPushSubscription,
  setupLoadStylesheet,
} from '__test__/support/helpers/setup';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { SlidedownManager } from 'src/page/managers/slidedownManager/SlidedownManager';
import ChannelCaptureContainer from 'src/page/slidedown/ChannelCaptureContainer';
import Log from 'src/shared/libraries/Log';
import { SubscriptionManagerPage } from 'src/shared/managers/subscription/page';
import { DelayedPromptType } from 'src/shared/prompts/constants';
import { SubscriptionType } from 'src/shared/subscriptions/constants';

vi.spyOn(Log, '_error').mockImplementation(() => '');

describe('Slidedown Types', () => {
  beforeEach(() => {
    getNotificationIcons();
    TestEnvironment.initialize({
      userConfig: config,
      initUserAndPushSubscription: true,
      initOneSignalId: false,
    });
    document.body.innerHTML = '';
    setupLoadStylesheet();
    mockPhoneLibraryLoading();
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
          ...BASE_SUB,
          token: 'test@test.com',
          type: SubscriptionType.Email,
        },
      ],
    });
  });

  test('can show sms slidedown', async () => {
    const addSmsSpy = vi.spyOn(OneSignal.User, 'addSms');
    setCreateUserResponse();
    await OneSignal.Slidedown.promptSms();

    expect(getMessageText()).toBe(message);

    const submitButton = getSubmitButton();
    const smsInput = getSmsInput();

    // has validation message
    expect(getSmsValidationMessage()).toBe('Please enter a valid phone number');

    // can add sms subscription
    smsInput.value = '+11234567890';
    submitButton.click();

    expect(addSmsSpy).toHaveBeenCalled();
    await vi.waitUntil(() => createUserFn.mock.calls.length > 0);
    expect(createUserFn).toHaveBeenCalledWith({
      identity: {},
      ...BASE_IDENTITY,
      subscriptions: [
        {
          ...BASE_SUB,
          token: '+1234567890',
          type: SubscriptionType.SMS,
        },
      ],
    });
  });

  test('can add sms and email', async () => {
    const addSmsSpy = vi.spyOn(OneSignal.User, 'addSms');
    const addEmailSpy = vi.spyOn(OneSignal.User, 'addEmail');
    setCreateUserResponse();
    await OneSignal.Slidedown.promptSmsAndEmail();

    const submitButton = getSubmitButton();
    const smsInput = getSmsInput();
    const emailInput = getEmailInput();

    // can add sms and email subscription
    smsInput.value = '+11234567890';
    emailInput.value = 'test@test.com';
    submitButton.click();

    expect(addSmsSpy).toHaveBeenCalled();
    expect(addEmailSpy).toHaveBeenCalled();
    await vi.waitUntil(() => createUserFn.mock.calls.length > 0);
    expect(createUserFn).toHaveBeenCalledWith({
      identity: {},
      ...BASE_IDENTITY,
      subscriptions: [
        {
          ...BASE_SUB,
          token: 'test@test.com',
          type: SubscriptionType.Email,
        },
        {
          ...BASE_SUB,
          token: '+1234567890',
          type: SubscriptionType.SMS,
        },
      ],
    });
  });

  test('can show category slidedown', async () => {
    mockSubscribeCall();
    await OneSignal.Slidedown.promptPushCategories();

    expect(getMessageText()).toBe(message);

    const submitButton = getSubmitButton();

    // toggle sports
    const sportsCheckbox = document.querySelector(
      'input[value="sports"]',
    ) as HTMLInputElement;
    expect(sportsCheckbox.checked).toBe(true);

    sportsCheckbox.click();
    expect(sportsCheckbox.checked).toBe(false);

    setCreateUserResponse();
    setUpdateUserResponse();
    submitButton.click();

    await vi.waitUntil(() => createUserFn.mock.calls.length > 0);
    expect(createUserFn).toHaveBeenCalledWith({
      identity: {},
      ...BASE_IDENTITY,
      subscriptions: [
        {
          ...BASE_SUB,
          token: PUSH_TOKEN,
          type: SubscriptionType.ChromePush,
          web_auth: 'w3cAuth',
          web_p256: 'w3cP256dh',
        },
      ],
    });
    await vi.waitUntil(() => updateUserFn.mock.calls.length > 0);
    expect(updateUserFn).toHaveBeenCalledWith({
      properties: {
        tags: {
          politics: '1',
          sports: '0',
          world_news: '1',
        },
      },
      refresh_device_metadata: false,
    });
  });
});

const warnSpy = vi.spyOn(Log, '_warn');
describe('Consent Required', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    OneSignal.setConsentRequired(true);
  });

  test('should not show slidedown if consent is required but not given', async () => {
    const slidedownManager = new SlidedownManager(OneSignal.context);
    await slidedownManager.createSlidedown({});
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');
  });
});

// helpers
const getMessageText = () =>
  (document.querySelector('.slidedown-body-message') as HTMLElement)?.innerText;

const getSubmitButton = () =>
  document.querySelector(
    '#onesignal-slidedown-allow-button',
  ) as HTMLButtonElement;

const getEmailInput = () =>
  document.querySelector('#onesignal-email-input') as HTMLInputElement;

const getEmailValidationMessage = () =>
  (
    document.querySelector('#onesignal-email-validation-element')
      ?.childNodes[1] as HTMLElement
  )?.innerText;

const getSmsInput = () =>
  document.querySelector('#iti-onesignal-sms-input') as HTMLInputElement;

const getSmsValidationMessage = () =>
  (
    document.querySelector('#onesignal-sms-validation-element')
      ?.childNodes[1] as HTMLElement
  )?.innerText;

const message = 'Receive the latest news, updates and offers as they happen.';

const config = {
  promptOptions: {
    slidedown: {
      prompts: [
        {
          autoPrompt: true,
          categories: [
            { tag: 'world_news', label: 'World News', checked: true },
            { tag: 'sports', label: 'Sports', checked: true },
            { tag: 'politics', label: 'Politics', checked: true },
          ],
          isTagsEnabled: true,
          text: {
            acceptButton: 'Submit',
            cancelButton: 'No Thanks',
            actionMessage: message,
          },
          type: DelayedPromptType.Category,
        },
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

const subscribeFcmFromPageSpy = vi.spyOn(
  SubscriptionManagerPage.prototype,
  '_subscribeFcmFromPage',
);

const mockSubscribeCall = () => {
  const rawPushSubscription = getRawPushSubscription();
  subscribeFcmFromPageSpy.mockImplementation(async () => rawPushSubscription);
};

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});

export const mockPhoneLibraryLoading = () => {
  vi.spyOn(
    ChannelCaptureContainer.prototype,
    'loadPhoneLibraryScripts',
  ).mockImplementation(async () => {
    OneSignal._didLoadITILibrary = true;

    // @ts-expect-error - mock intl-tel-input
    window.intlTelInput = vi.fn().mockImplementation((input) => ({
      getNumber: () => '+1234567890', // Return formatted number
      isValidNumber: () => true,
      getNumberType: () => 0,
      destroy: () => {},
    }));

    window.intlTelInputUtils = {
      numberType: { MOBILE: 1 },
      numberFormat: { E164: 0 },
    };

    return Promise.resolve();
  });
};
