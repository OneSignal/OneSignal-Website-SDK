import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Bell from './Bell';
import Dialog from './Dialog';
import { BellState } from './constants';

describe('Dialog', () => {
  beforeEach(() => {
    TestEnvironment.initialize({ initOneSignalId: false });
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-dialog">
        <div class="onesignal-bell-launcher-dialog-body"></div>
      </div>
    `;
    // Polyfill Web Animations API method used by AnimatedElement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLElement.prototype as any).getAnimations = () => [];
  });

  test('_show populates content and toggles shown flag', async () => {
    const bell = new Bell({ enable: false });
    // Put bell in unsubscribed state to render subscribe button
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bell as any)._state = BellState._Unsubscribed;
    // Force subscription manager response to "disabled"
    const sm = OneSignal._context._subscriptionManager as any;
    vi.spyOn(sm, '_isPushNotificationsEnabled').mockResolvedValue(false);

    const dialog = new Dialog(bell);
    expect(dialog['_shown']).toBe(false);
    await dialog['_show']();
    expect(dialog['_shown']).toBe(true);
    // Button should be present for subscribe
    expect(dialog['_subscribeButton']).toBeTruthy();
  });

  test('_hide removes shown class and keeps state consistent', async () => {
    const bell = new Bell({ enable: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bell as any)._state = BellState._Unsubscribed;
    const sm = OneSignal._context._subscriptionManager as any;
    vi.spyOn(sm, '_isPushNotificationsEnabled').mockResolvedValue(false);

    const dialog = new Dialog(bell);
    await dialog['_show']();
    expect(dialog['_shown']).toBe(true);
    await dialog['_hide']();
    expect(dialog['_shown']).toBe(false);
  });
});


