import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { Browser } from 'src/shared/useragent/constants';
import * as detect from 'src/shared/useragent/detect';
import * as utils from 'src/shared/utils/utils';
import { describe, test, expect, beforeEach, vi, type MockInstance } from 'vite-plus/test';

import Bell from './Bell';
import { BellState } from './constants';
import Dialog from './Dialog';

describe('Dialog', () => {
  let isPushEnabledSpy: MockInstance;

  beforeEach(() => {
    TestEnvironment.initialize();
    vi.restoreAllMocks();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-dialog" id="onesignal-bell-dialog" popover="auto">
        <div class="onesignal-bell-launcher-dialog-body"></div>
      </div>
    `;
    isPushEnabledSpy = vi.spyOn(
      OneSignal._context._subscriptionManager,
      '_isPushNotificationsEnabled',
    );
  });

  test('_shown returns false when popover is closed', () => {
    const dialog = new Dialog(new Bell({ enable: false }));
    expect(dialog._shown).toBe(false);
  });

  test('_hide calls hidePopover when dialog is open', () => {
    const dialog = new Dialog(new Bell({ enable: false }));
    const el = dialog._element!;
    const hidePopoverSpy = vi.fn();
    el.hidePopover = hidePopoverSpy;
    vi.spyOn(dialog, '_shown', 'get').mockReturnValue(true);
    dialog._hide();
    expect(hidePopoverSpy).toHaveBeenCalled();
  });

  test('_hide is a no-op when already hidden', () => {
    const dialog = new Dialog(new Bell({ enable: false }));
    const el = dialog._element!;
    const hidePopoverSpy = vi.fn();
    el.hidePopover = hidePopoverSpy;
    dialog._hide();
    expect(hidePopoverSpy).not.toHaveBeenCalled();
  });

  test('_updateContent renders subscribe button when unsubscribed', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
    expect(body.querySelector('h1')?.textContent).toBe('Manage Site Notifications');
    expect(dialog._subscribeButton?.textContent).toBe('SUBSCRIBE');
    expect(dialog._subscribeButton).not.toBeNull();
    expect(dialog._unsubscribeButton).toBeNull();
  });

  test('_updateContent renders unsubscribe button when subscribed', async () => {
    isPushEnabledSpy.mockResolvedValue(true);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Subscribed;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
    expect(body.querySelector('h1')?.textContent).toBe('Manage Site Notifications');
    expect(dialog._unsubscribeButton?.textContent).toBe('UNSUBSCRIBE');
    expect(dialog._unsubscribeButton).not.toBeNull();
    expect(dialog._subscribeButton).toBeNull();
  });

  test('subscribe button calls _onSubscribeClick', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    const onSubscribeClickSpy = vi.fn();
    bell._onSubscribeClick = onSubscribeClickSpy;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    dialog._subscribeButton!.click();
    expect(onSubscribeClickSpy).toHaveBeenCalled();
  });

  test('unsubscribe button calls _onUnsubscribeClick', async () => {
    isPushEnabledSpy.mockResolvedValue(true);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Subscribed;
    const onUnsubscribeClickSpy = vi.fn();
    bell._onUnsubscribeClick = onUnsubscribeClickSpy;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    dialog._unsubscribeButton!.click();
    expect(onUnsubscribeClickSpy).toHaveBeenCalled();
  });

  test('_updateContent uses custom notification icon when available', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    vi.spyOn(utils, 'getPlatformNotificationIcon').mockReturnValue('https://example.com/icon.png');
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const img = dialog._element!.querySelector('.push-notification-icon img');
    expect(img?.getAttribute('src')).toBe('https://example.com/icon.png');
  });

  test('_updateContent uses default icon class when no custom icon', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    vi.spyOn(utils, 'getPlatformNotificationIcon').mockReturnValue('default-icon');
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const icon = dialog._element!.querySelector('.push-notification-icon-default');
    expect(icon).not.toBeNull();
  });

  test('_updateContent renders blocked content when state is blocked', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    vi.spyOn(detect, 'getBrowserName').mockReturnValue(Browser._Chrome);
    vi.spyOn(detect, 'isMobileBrowser').mockReturnValue(false);
    vi.spyOn(detect, 'isTabletBrowser').mockReturnValue(false);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Blocked;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
    expect(body.querySelector('h1')?.textContent).toBe('Unblock Notifications');
    expect(body.querySelector('.instructions p')?.textContent).toBe(
      'Follow these instructions to allow notifications:',
    );
    expect(body.querySelector('.instructions')).not.toBeNull();
    expect(body.querySelector('img')?.src).toContain('chrome-unblock.jpg');
  });

  test('blocked content shows mobile instructions for Chrome mobile', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    vi.spyOn(detect, 'getBrowserName').mockReturnValue(Browser._Chrome);
    vi.spyOn(detect, 'isMobileBrowser').mockReturnValue(true);
    vi.spyOn(detect, 'isTabletBrowser').mockReturnValue(false);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Blocked;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
    expect(body.querySelector('ol')).not.toBeNull();
    expect(body.querySelector('img')).toBeNull();
  });

  // SDK-4535
  describe('text rendering', () => {
    const RAW_INPUT = 'Notifications &amp; Updates <img src=a>';
    const EXPECTED_TEXT = 'Notifications & Updates ';

    test('renders dialog.main.title with entities decoded and tags stripped', async () => {
      isPushEnabledSpy.mockResolvedValue(false);
      const bell = new Bell({ enable: false });
      bell._state = BellState._Unsubscribed;
      bell._options.text['dialog.main.title'] = RAW_INPUT;
      const dialog = new Dialog(bell);

      await dialog._updateContent();

      const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
      expect(body.querySelector('h1')?.textContent).toBe(EXPECTED_TEXT);
      expect(body.querySelector('h1 img')).toBeNull();
    });

    test('renders dialog.main.button.subscribe with entities decoded and tags stripped', async () => {
      isPushEnabledSpy.mockResolvedValue(false);
      const bell = new Bell({ enable: false });
      bell._state = BellState._Unsubscribed;
      bell._options.text['dialog.main.button.subscribe'] = RAW_INPUT;
      const dialog = new Dialog(bell);

      await dialog._updateContent();

      expect(dialog._subscribeButton?.textContent).toBe(EXPECTED_TEXT);
      expect(dialog._subscribeButton?.querySelector('img')).toBeNull();
    });

    test('renders dialog.blocked.title with entities decoded and tags stripped', async () => {
      isPushEnabledSpy.mockResolvedValue(false);
      vi.spyOn(detect, 'getBrowserName').mockReturnValue(Browser._Chrome);
      vi.spyOn(detect, 'isMobileBrowser').mockReturnValue(false);
      vi.spyOn(detect, 'isTabletBrowser').mockReturnValue(false);
      const bell = new Bell({ enable: false });
      bell._state = BellState._Blocked;
      bell._options.text['dialog.blocked.title'] = RAW_INPUT;
      const dialog = new Dialog(bell);

      await dialog._updateContent();

      const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
      expect(body.querySelector('h1')?.textContent).toBe(EXPECTED_TEXT);
      expect(body.querySelector('h1 img')).toBeNull();
    });

    test('icon URL with special chars stays inside src attribute', async () => {
      isPushEnabledSpy.mockResolvedValue(false);
      vi.spyOn(utils, 'getPlatformNotificationIcon').mockReturnValue('icon.png" extra="x');
      const bell = new Bell({ enable: false });
      bell._state = BellState._Unsubscribed;
      const dialog = new Dialog(bell);

      await dialog._updateContent();

      const img = dialog._element!.querySelector('.push-notification-icon img');
      expect(img?.getAttribute('src')).toBe('icon.png" extra="x');
      expect(img?.hasAttribute('extra')).toBe(false);
    });

    test('renders dialog.blocked.message with entities decoded and tags stripped', async () => {
      isPushEnabledSpy.mockResolvedValue(false);
      vi.spyOn(detect, 'getBrowserName').mockReturnValue(Browser._Chrome);
      vi.spyOn(detect, 'isMobileBrowser').mockReturnValue(false);
      vi.spyOn(detect, 'isTabletBrowser').mockReturnValue(false);
      const bell = new Bell({ enable: false });
      bell._state = BellState._Blocked;
      bell._options.text['dialog.blocked.message'] = RAW_INPUT;
      const dialog = new Dialog(bell);

      await dialog._updateContent();

      const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
      expect(body.querySelector('.instructions p')?.textContent).toBe(EXPECTED_TEXT);
      expect(body.querySelector('.instructions p img')).toBeNull();
    });
  });

  test('_updateContent includes credit footer when showCredit is true', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    bell._options.showCredit = true;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const kickback = dialog._element!.querySelector('.kickback');
    expect(kickback).not.toBeNull();
  });

  test('_updateContent omits credit footer for the fallback state even when showCredit is true', async () => {
    isPushEnabledSpy.mockResolvedValue(false);
    const bell = new Bell({ enable: false });
    bell._state = BellState._Uninitialized;
    bell._options.showCredit = true;
    const dialog = new Dialog(bell);

    await dialog._updateContent();
    const body = dialog._element!.querySelector('.onesignal-bell-launcher-dialog-body')!;
    expect(body.textContent).toBe('Nothing to show.');
    expect(dialog._element!.querySelector('.kickback')).toBeNull();
  });
});
