import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { vi } from 'vitest';
import Bell from './Bell';
import { BellState } from './constants';

// @ts-expect-error - _installEventHooks is not assignable
const spyInstall = vi.spyOn(Bell.prototype, '_installEventHooks');
const updateStateSpy = vi.spyOn(Bell.prototype, '_updateState');
describe('Bell', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('constructor early-returns when enable=false and applies defaults', () => {
    const bell = new Bell({ enable: false });
    expect(bell._options.size).toBe('medium');
    expect(bell._options.position).toBe('bottom-right');
    expect(bell._options.theme).toBe('default');
    expect(spyInstall).not.toHaveBeenCalled();
    expect(updateStateSpy).not.toHaveBeenCalled();
  });

  test('constructor validates and installs hooks when enable=true', () => {
    const bell = new Bell({
      enable: true,
      size: 'small',
      position: 'bottom-left',
      theme: 'inverse',
      showBadgeAfter: 10,
      showLauncherAfter: 1,
    });
    expect(bell).toBeTruthy();
    expect(spyInstall).toHaveBeenCalledTimes(1);
    expect(updateStateSpy).toHaveBeenCalledTimes(1);
  });

  test('_setState updates state', () => {
    const bell = new Bell({ enable: false });
    expect(bell._state).toBe(BellState._Uninitialized);
    bell._setState(BellState._Subscribed);
    expect(bell._subscribed).toBe(true);
  });

  test('_setState skips when silent', () => {
    const bell = new Bell({ enable: false });
    bell._setState(BellState._Subscribed, true);
    expect(bell._subscribed).toBe(true);
  });

  test('_updateState sets blocked when permission denied', async () => {
    const bell = new Bell({ enable: false });
    const permSpy = vi
      .spyOn(OneSignal._context._permissionManager, '_getPermissionStatus')
      .mockResolvedValue('denied');
    const enabledSpy = vi
      .spyOn(
        OneSignal._context._subscriptionManager,
        '_isPushNotificationsEnabled',
      )
      .mockResolvedValue(false);
    bell._updateState();
    await Promise.resolve();
    await Promise.resolve();
    expect(bell._blocked).toBe(true);
    expect(permSpy).toHaveBeenCalled();
    expect(enabledSpy).toHaveBeenCalled();
  });

  test('_setCustomColorsIfSpecified sets CSS variables on launcher', () => {
    const bell = new Bell({ enable: false });
    document.body.innerHTML = '<div class="onesignal-bell-launcher"></div>';
    bell._options.colors = {
      'circle.background': '#111',
      'circle.foreground': '#222',
      'badge.background': '#333',
      'badge.bordercolor': '#444',
      'badge.foreground': '#555',
      'dialog.button.background': '#666',
      'dialog.button.foreground': '#777',
      'dialog.button.background.hovering': '#888',
      'dialog.button.background.active': '#999',
      'pulse.color': '#abc',
    };
    bell._setCustomColorsIfSpecified();
    const el = document.querySelector<HTMLElement>('.onesignal-bell-launcher')!;
    expect(el.style.getPropertyValue('--bell-bg')).toBe('#111');
    expect(el.style.getPropertyValue('--bell-fg')).toBe('#222');
    expect(el.style.getPropertyValue('--badge-bg')).toBe('#333');
    expect(el.style.getPropertyValue('--badge-border')).toBe('#444');
    expect(el.style.getPropertyValue('--badge-fg')).toBe('#555');
    expect(el.style.getPropertyValue('--btn-bg')).toBe('#666');
    expect(el.style.getPropertyValue('--btn-fg')).toBe('#777');
    expect(el.style.getPropertyValue('--btn-hover-bg')).toBe('#888');
    expect(el.style.getPropertyValue('--btn-active-bg')).toBe('#999');
    expect(el.style.getPropertyValue('--pulse-color')).toBe('#abc');
  });
});
