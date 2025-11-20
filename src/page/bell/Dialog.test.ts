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
      <div class="onesignal-bell-launcher-dialog">
        <div class="onesignal-bell-launcher-dialog-body"></div>
      </div>
    `;
    const sm = OneSignal._context._subscriptionManager;
    isPushNotificationsEnabledSpy = vi.spyOn(sm, '_isPushNotificationsEnabled');
  });

  test('_show populates content and toggles shown flag', async () => {
    const bell = new Bell({ enable: false });
    // Put bell in unsubscribed state to render subscribe button
    bell._state = BellState._Unsubscribed;
    isPushNotificationsEnabledSpy.mockResolvedValue(false);

    const dialog = new Dialog(bell);
    expect(dialog._shown).toBe(false);
    await dialog._show();
    expect(dialog._shown).toBe(true);
    // Button should be present for subscribe
    expect(dialog._subscribeButton).toBeTruthy();
  });

  test('_hide removes shown class and keeps state consistent', async () => {
    const bell = new Bell({ enable: false });
    bell._state = BellState._Unsubscribed;
    isPushNotificationsEnabledSpy.mockResolvedValue(false);

    const dialog = new Dialog(bell);
    await dialog._show();
    expect(dialog._shown).toBe(true);
    await dialog._hide();
    expect(dialog._shown).toBe(false);
  });
});
