import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { InvalidChannelInputField } from 'src/shared/errors/constants';
import { getNotificationIcons } from 'src/shared/helpers/main';
import { DelayedPromptType } from 'src/shared/prompts/constants';
import type { SlidedownPromptOptions } from 'src/shared/prompts/types';
import { SLIDEDOWN_CSS_CLASSES, SLIDEDOWN_CSS_IDS } from 'src/shared/slidedown/constants';
import { describe, test, expect, beforeEach, vi } from 'vite-plus/test';

import Bell from '../bell/Bell';
import ChannelCaptureContainer from './ChannelCaptureContainer';
import Slidedown, { manageNotifyButtonStateWhileSlidedownShows } from './Slidedown';

vi.mock('src/shared/helpers/main', () => ({
  getNotificationIcons: vi.fn().mockResolvedValue(null),
}));

function createBell() {
  return new Bell({ enable: true });
}

const defaultOptions: SlidedownPromptOptions = {
  type: DelayedPromptType._Push,
  text: {
    actionMessage: 'Subscribe to notifications',
    acceptButton: 'Allow',
    cancelButton: 'Cancel',
  },
  autoPrompt: true,
};

function createSlidedown(overrides?: Partial<SlidedownPromptOptions>) {
  return new Slidedown({
    ...defaultOptions,
    text: { ...defaultOptions.text },
    ...overrides,
  });
}

describe('Slidedown', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('constructor', () => {
    test('truncates text fields', () => {
      const sd = createSlidedown({
        text: {
          actionMessage: 'a'.repeat(100),
          acceptButton: 'b'.repeat(20),
          cancelButton: 'c'.repeat(20),
        },
      });
      expect(sd._options.text.actionMessage).toHaveLength(90);
      expect(sd._options.text.acceptButton).toHaveLength(16);
      expect(sd._options.text.cancelButton).toHaveLength(16);
    });

    test('sets category-specific fields for category type', () => {
      const sd = createSlidedown({
        type: DelayedPromptType._Category,
        text: {
          ...defaultOptions.text,
          updateMessage: 'Update prefs',
          positiveUpdateButton: 'Save',
          negativeUpdateButton: 'Cancel',
        },
        categories: [{ tag: 'news', label: 'News' }],
      });
      expect(sd._options.type).toBe(DelayedPromptType._Category);
    });

    test('sets errorButton from acceptButton for email type', () => {
      const sd = createSlidedown({
        type: DelayedPromptType._Email,
        text: {
          ...defaultOptions.text,
          acceptButton: 'Submit',
        },
      });
      expect(sd._isShowingFailureState).toBe(false);
    });
  });

  describe('_create', () => {
    test('creates container and dialog in DOM', async () => {
      const sd = createSlidedown();
      await sd._create();

      expect(document.querySelector(`#${SLIDEDOWN_CSS_IDS._Container}`)).toBeTruthy();
      expect(document.querySelector(`#${SLIDEDOWN_CSS_IDS._Dialog}`)).toBeTruthy();
      expect(document.querySelector(`#${SLIDEDOWN_CSS_IDS._AllowButton}`)).toBeTruthy();
      expect(document.querySelector(`#${SLIDEDOWN_CSS_IDS._CancelButton}`)).toBeTruthy();
    });

    test('adds slide-down class on desktop', async () => {
      const sd = createSlidedown();
      await sd._create();

      expect(sd._container.classList.contains(SLIDEDOWN_CSS_CLASSES._SlideDown)).toBe(true);
    });

    test('fetches notification icons', async () => {
      const sd = createSlidedown();
      await sd._create();

      expect(getNotificationIcons).toHaveBeenCalled();
      expect(sd._notificationIcons).toBeNull();
    });

    test('skips creation when icons already loaded', async () => {
      const sd = createSlidedown();
      sd._notificationIcons = {
        chrome: 'test.png',
        firefox: null,
        safari: null,
      };

      await sd._create();

      expect(getNotificationIcons).not.toHaveBeenCalled();
    });

    test('removes existing container before creating new one', async () => {
      const sd = createSlidedown();
      await sd._create();

      const firstContainer = document.querySelector(`#${SLIDEDOWN_CSS_IDS._Container}`);
      expect(firstContainer).toBeTruthy();

      sd._notificationIcons = null;
      await sd._create();

      const containers = document.querySelectorAll(`#${SLIDEDOWN_CSS_IDS._Container}`);
      expect(containers).toHaveLength(1);
    });

    test('displays button text from options', async () => {
      const sd = createSlidedown({
        text: {
          actionMessage: 'Get notified',
          acceptButton: 'Yes',
          cancelButton: 'No',
        },
      });
      await sd._create();

      expect(sd._allowButton.innerText).toBe('Yes');
      expect(sd._cancelButton.innerText).toBe('No');
    });
  });

  describe('_onSlidedownCanceled', () => {
    test('triggers cancel and closed events and adds close class', async () => {
      const sd = createSlidedown();
      await sd._create();

      const cancelSpy = vi.fn();
      const closedSpy = vi.fn();
      OneSignal._emitter.on(Slidedown.EVENTS.CANCEL_CLICK, cancelSpy);
      OneSignal._emitter.on(Slidedown.EVENTS.CLOSED, closedSpy);

      sd._onSlidedownCanceled(null);

      await vi.waitFor(() => {
        expect(cancelSpy).toHaveBeenCalled();
        expect(closedSpy).toHaveBeenCalled();
      });
      expect(sd._container.classList.contains(SLIDEDOWN_CSS_CLASSES._CloseSlidedown)).toBe(true);
    });
  });

  describe('_onSlidedownAllowed', () => {
    test('triggers allow click event', async () => {
      const sd = createSlidedown();
      const allowSpy = vi.fn();
      OneSignal._emitter.on(Slidedown.EVENTS.ALLOW_CLICK, allowSpy);

      await sd._onSlidedownAllowed(null);

      expect(allowSpy).toHaveBeenCalled();
    });
  });

  describe('_close', () => {
    test('adds close-slidedown class to container', async () => {
      const sd = createSlidedown();
      await sd._create();

      sd._close();

      expect(sd._container.classList.contains(SLIDEDOWN_CSS_CLASSES._CloseSlidedown)).toBe(true);
    });
  });

  describe('_setSaveState', () => {
    test('disables allow button and shows saving text', async () => {
      const sd = createSlidedown();
      await sd._create();

      sd._setSaveState();

      expect(sd._allowButton.disabled).toBe(true);
      expect(sd._allowButton.classList.contains('disabled')).toBe(true);
      expect(sd._allowButton.classList.contains(SLIDEDOWN_CSS_CLASSES._SavingStateButton)).toBe(
        true,
      );
    });
  });

  describe('_removeSaveState', () => {
    test('re-enables allow button and removes saving class', async () => {
      const sd = createSlidedown();
      await sd._create();

      sd._setSaveState();
      sd._removeSaveState();

      expect(sd._allowButton.disabled).toBe(false);
      expect(sd._allowButton.classList.contains('disabled')).toBe(false);
      expect(sd._allowButton.classList.contains(SLIDEDOWN_CSS_CLASSES._SavingStateButton)).toBe(
        false,
      );
    });
  });

  describe('_setFailureState', () => {
    test('sets failure flag', async () => {
      const sd = createSlidedown();
      await sd._create();

      sd._setFailureState();

      expect(sd._isShowingFailureState).toBe(true);
    });

    test('adds error class for category type', async () => {
      const sd = createSlidedown({
        type: DelayedPromptType._Category,
        text: {
          ...defaultOptions.text,
          positiveUpdateButton: 'Save',
          negativeUpdateButton: 'Cancel',
        },
        categories: [],
      });
      await sd._create();

      sd._setFailureState();

      expect(sd._allowButton.classList.contains('onesignal-error-state-button')).toBe(true);
    });
  });

  describe('_removeFailureState', () => {
    test('clears failure flag and error class', async () => {
      const sd = createSlidedown();
      await sd._create();

      sd._setFailureState();
      sd._removeFailureState();

      expect(sd._isShowingFailureState).toBe(false);
      expect(sd._allowButton.classList.contains('onesignal-error-state-button')).toBe(false);
    });
  });

  describe('_setFailureStateForInvalidChannelInput', () => {
    test('shows SMS error for invalid SMS', () => {
      const smsSpy = vi
        .spyOn(ChannelCaptureContainer, '_showSmsInputError')
        .mockImplementation(() => {});
      const sd = createSlidedown();

      sd._setFailureStateForInvalidChannelInput(InvalidChannelInputField._InvalidSms);

      expect(smsSpy).toHaveBeenCalledWith(true);
    });

    test('shows email error for invalid email', () => {
      const emailSpy = vi
        .spyOn(ChannelCaptureContainer, '_showEmailInputError')
        .mockImplementation(() => {});
      const sd = createSlidedown();

      sd._setFailureStateForInvalidChannelInput(InvalidChannelInputField._InvalidEmail);

      expect(emailSpy).toHaveBeenCalledWith(true);
    });

    test('shows both errors for invalid email and SMS', () => {
      const smsSpy = vi
        .spyOn(ChannelCaptureContainer, '_showSmsInputError')
        .mockImplementation(() => {});
      const emailSpy = vi
        .spyOn(ChannelCaptureContainer, '_showEmailInputError')
        .mockImplementation(() => {});
      const sd = createSlidedown();

      sd._setFailureStateForInvalidChannelInput(InvalidChannelInputField._InvalidEmailAndSms);

      expect(smsSpy).toHaveBeenCalledWith(true);
      expect(emailSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('EVENTS', () => {
    test('exposes expected event names', () => {
      expect(Slidedown.EVENTS).toEqual({
        ALLOW_CLICK: 'slidedownAllowClick',
        CANCEL_CLICK: 'slidedownCancelClick',
        SHOWN: 'slidedownShown',
        CLOSED: 'slidedownClosed',
        QUEUED: 'slidedownQueued',
      });
    });
  });
});

describe('manageNotifyButtonStateWhileSlidedownShows', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher">
        <div class="onesignal-bell-launcher-dialog" id="onesignal-bell-dialog" popover="auto">
          <div class="onesignal-bell-launcher-dialog-body"></div>
        </div>
      </div>
    `;
  });

  test('no-op when notify button is null', () => {
    OneSignal._notifyButton = null;
    manageNotifyButtonStateWhileSlidedownShows();
    expect(OneSignal._emitter._numberOfListeners('slidedownClosed')).toBe(0);
  });

  test('no-op when notify button is disabled', () => {
    OneSignal._notifyButton = new Bell({ enable: false });
    manageNotifyButtonStateWhileSlidedownShows();
    expect(OneSignal._emitter._numberOfListeners('slidedownClosed')).toBe(0);
  });

  test('hides shown launcher', async () => {
    const bell = createBell();
    await bell._launcher._show();
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(bell._launcher._shown).toBe(false);
  });

  test('restores launcher when slidedown closes', async () => {
    const bell = createBell();
    await bell._launcher._show();
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(bell._launcher._shown).toBe(false);

    await OneSignal._emitter._emit('slidedownClosed');
    expect(bell._launcher._shown).toBe(true);
  });

  test('registers restore listener even when launcher is not shown', () => {
    const bell = createBell();
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(bell._launcher._shown).toBe(false);
    expect(OneSignal._emitter._numberOfListeners('slidedownClosed')).toBe(1);
  });

  test('hides dialog popover when hiding launcher', async () => {
    const bell = createBell();
    await bell._launcher._show();
    const dialogHide = vi.spyOn(bell._dialog, '_hide');
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(dialogHide).toHaveBeenCalled();
  });
});
