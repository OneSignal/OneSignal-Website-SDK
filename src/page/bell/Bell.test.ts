import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { vi } from 'vitest';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import Bell from './Bell';
import { BellEvent, BellState } from './constants';

// @ts-expect-error - _installEventHooks is not assignable
const spyInstall = vi.spyOn(Bell.prototype, '_installEventHooks');
const updateStateSpy = vi.spyOn(Bell.prototype, '_updateState');
describe('Bell', () => {
  beforeEach(() => {
    // Set up OneSignal globals/context to avoid accidental runtime lookups
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
    // Valid non-defaults to ensure validation path runs
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

  test('_setState triggers event when changed', () => {
    const bell = new Bell({ enable: false });
    const trigger = vi.spyOn(OneSignalEvent, '_trigger');
    // transition should emit
    bell._setState(BellState._Subscribed);

    expect(trigger).toHaveBeenCalledWith(BellEvent._StateChanged, {
      from: BellState._Uninitialized,
      to: BellState._Subscribed,
    });
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

  test('_setCustomColorsIfSpecified applies styles and adds CSS to head', async () => {
    const bell = new Bell({ enable: false });
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher">
        <div class="onesignal-bell-launcher-button">
          <svg>
            <circle class="background"></circle>
            <g class="foreground"></g>
            <ellipse class="stroke"></ellipse>
          </svg>
          <div class="pulse-ring"></div>
        </div>
        <div class="onesignal-bell-launcher-badge"></div>
        <div class="onesignal-bell-launcher-dialog">
          <div class="onesignal-bell-launcher-dialog-body">
            <button class="action">A</button>
          </div>
        </div>
      </div>
    `;
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
    const background = document.querySelector<HTMLElement>('.background')!;
    expect(background.getAttribute('style')).toContain('#111');
    const badge = document.querySelector<HTMLElement>(
      '.onesignal-bell-launcher-badge',
    )!;
    expect(badge.getAttribute('style')).toContain('rgb(51, 51, 51)');
    const styleHover = document.getElementById(
      'onesignal-background-hover-style',
    );
    expect(styleHover).not.toBeNull();
  });

  test('_addCssToHead appends once', () => {
    const bell = new Bell({ enable: false });
    bell._addCssToHead('x', '.a{color:red}');
    bell._addCssToHead('x', '.b{color:blue}');
    const style = document.getElementById('x')!;
    expect(style.textContent).toContain('.a{color:red}');
  });
});
