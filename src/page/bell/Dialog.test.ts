import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import type { MockInstance } from 'vitest';
import Bell from './Bell';
import Dialog from './Dialog';
import { BellState } from './constants';

describe('Dialog', () => {
  let isPushNotificationsEnabledSpy: MockInstance;

  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-dialog" id="onesignal-bell-dialog" popover="auto">
        <div class="onesignal-bell-launcher-dialog-body"></div>
      </div>
    `;
    isPushNotificationsEnabledSpy = vi.spyOn(
      OneSignal._context._subscriptionManager,
      '_isPushNotificationsEnabled',
    );
  });

  test('_updateContent populates dialog body with subscribe button', async () => {
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    isPushNotificationsEnabledSpy.mockResolvedValue(false);

    const dialog = new Dialog(bell);
    await dialog._updateContent();
    expect(dialog._subscribeButton).not.toBeNull();
  });

  test('_hide calls hidePopover when dialog is open', () => {
    const bell = new Bell({ enable: false });
    const dialog = new Dialog(bell);
    const el = dialog._element;
    if (el) {
      el.hidePopover = vi.fn();
      vi.spyOn(dialog, '_shown', 'get').mockReturnValue(true);
    }
    dialog._hide();
    expect(el?.hidePopover).toHaveBeenCalled();
  });
});
