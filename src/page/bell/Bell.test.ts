import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Log from 'src/shared/libraries/Log';
import { describe, test, expect, beforeEach, vi } from 'vite-plus/test';

import { ResourceLoadState } from '../services/DynamicResourceLoader';
import Bell from './Bell';
import { BellState } from './constants';

describe('Bell', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    vi.restoreAllMocks();
  });

  test('constructor early-returns when enable=false and applies defaults', () => {
    // @ts-expect-error - private method
    const installSpy = vi.spyOn(Bell.prototype, '_installEventHooks');
    const updateSpy = vi.spyOn(Bell.prototype, '_updateState');

    const bell = new Bell({ enable: false });
    expect(bell._options.size).toBe('medium');
    expect(bell._options.position).toBe('bottom-right');
    expect(bell._options.theme).toBe('default');
    expect(installSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('constructor validates and installs hooks when enable=true', () => {
    // @ts-expect-error - private method
    const installSpy = vi.spyOn(Bell.prototype, '_installEventHooks');
    const updateSpy = vi.spyOn(Bell.prototype, '_updateState');

    const bell = new Bell({
      enable: true,
      size: 'small',
      position: 'bottom-left',
      theme: 'inverse',
      showBadgeAfter: 10,
      showLauncherAfter: 1,
    });
    expect(bell).toBeTruthy();
    expect(installSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('_setState updates state', () => {
    const bell = new Bell({ enable: false });
    expect(bell._state).toBe(BellState._Uninitialized);
    bell._setState(BellState._Subscribed);
    expect(bell._subscribed).toBe(true);
  });

  test('_setState sets state but skips message update when silent', () => {
    const bell = new Bell({ enable: false });
    bell._setState(BellState._Subscribed, true);
    expect(bell._subscribed).toBe(true);
  });

  test('_updateState sets blocked when permission denied', async () => {
    const bell = new Bell({ enable: false });
    vi.spyOn(OneSignal._context._permissionManager, '_getPermissionStatus').mockResolvedValue(
      'denied',
    );
    vi.spyOn(
      OneSignal._context._subscriptionManager,
      '_isPushNotificationsEnabled',
    ).mockResolvedValue(false);

    await bell._updateState();
    expect(bell._blocked).toBe(true);
  });

  test('_create early-returns when CSS anchor positioning is unsupported', async () => {
    vi.stubGlobal('CSS', { supports: () => false });
    const errorSpy = vi.spyOn(Log, '_error');
    const loadSpy = vi.spyOn(OneSignal._context._dynamicResourceLoader, '_loadSdkStylesheet');

    const bell = new Bell({ enable: true, showLauncherAfter: 0 });
    await bell._create();

    expect(errorSpy).toHaveBeenCalledWith('Bell requires CSS Anchor Positioning');
    expect(loadSpy).not.toHaveBeenCalled();
  });

  describe('_create prenotify', () => {
    function mockCreateDeps(opts: {
      isPushEnabled: boolean;
      permission: 'granted' | 'denied' | 'default';
      isNewVisitor: boolean;
    }) {
      vi.stubGlobal('CSS', { supports: () => true });
      vi.spyOn(OneSignal._context._dynamicResourceLoader, '_loadSdkStylesheet').mockResolvedValue(
        ResourceLoadState._Loaded,
      );
      vi.spyOn(
        OneSignal._context._subscriptionManager,
        '_isPushNotificationsEnabled',
      ).mockResolvedValue(opts.isPushEnabled);
      vi.spyOn(OneSignal._context._permissionManager, '_getPermissionStatus').mockResolvedValue(
        opts.permission,
      );
      OneSignal._isNewVisitor = opts.isNewVisitor;
    }

    test('shows prenotify message when unsubscribed and new visitor', async () => {
      mockCreateDeps({
        isPushEnabled: false,
        permission: 'default',
        isNewVisitor: true,
      });

      const bell = new Bell({
        enable: true,
        prenotify: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      expect(bell._state).toBe(BellState._Unsubscribed);
      expect(bell._message._content).toBe(bell._options.text['message.prenotify']);
    });

    test('does not show prenotify message when blocked', async () => {
      mockCreateDeps({
        isPushEnabled: false,
        permission: 'denied',
        isNewVisitor: true,
      });

      const bell = new Bell({
        enable: true,
        prenotify: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      expect(bell._state).toBe(BellState._Blocked);
      expect(bell._message._content).toBe(bell._options.text['tip.state.blocked']);
    });
  });

  describe('_create event listeners', () => {
    function mockCreateDeps() {
      vi.stubGlobal('CSS', { supports: () => true });
      vi.spyOn(OneSignal._context._dynamicResourceLoader, '_loadSdkStylesheet').mockResolvedValue(
        ResourceLoadState._Loaded,
      );
      vi.spyOn(
        OneSignal._context._subscriptionManager,
        '_isPushNotificationsEnabled',
      ).mockResolvedValue(false);
      vi.spyOn(OneSignal._context._permissionManager, '_getPermissionStatus').mockResolvedValue(
        'default',
      );
    }

    test('mouseleave on launcher blurs the button', async () => {
      mockCreateDeps();
      const bell = new Bell({ enable: true, showLauncherAfter: 0 });
      await bell._create();

      const buttonEl = bell._button._element!;
      const blurSpy = vi.spyOn(buttonEl, 'blur');

      bell._launcher._element!.dispatchEvent(new Event('mouseleave'));

      expect(blurSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrency', () => {
    function setupBellWithDOM() {
      vi.stubGlobal('CSS', { supports: () => true });
      vi.spyOn(OneSignal._context._dynamicResourceLoader, '_loadSdkStylesheet').mockResolvedValue(
        ResourceLoadState._Loaded,
      );
      vi.spyOn(
        OneSignal._context._subscriptionManager,
        '_isPushNotificationsEnabled',
      ).mockResolvedValue(false);
      vi.spyOn(OneSignal._context._permissionManager, '_getPermissionStatus').mockResolvedValue(
        'default',
      );
    }

    test('subscription change does not hide dialog while action in progress', async () => {
      setupBellWithDOM();
      const bell = new Bell({
        enable: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      bell._actionInProgress = true;
      bell._dialog._notificationIcons = {
        chrome: null,
        firefox: null,
        safari: null,
      };
      const dialogHideSpy = vi.spyOn(bell._dialog, '_hide');

      OneSignal._emitter._emit(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, {
        current: { optedIn: true },
      });

      expect(dialogHideSpy).not.toHaveBeenCalled();
    });

    test('subscription change hides dialog when no action in progress', async () => {
      setupBellWithDOM();
      const bell = new Bell({
        enable: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      bell._actionInProgress = false;
      bell._dialog._notificationIcons = {
        chrome: null,
        firefox: null,
        safari: null,
      };
      const dialogHideSpy = vi.spyOn(bell._dialog, '_hide');

      OneSignal._emitter._emit(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, {
        current: { optedIn: true },
      });

      expect(dialogHideSpy).toHaveBeenCalled();
    });

    test('_onSubscribeClick sets actionInProgress during execution', async () => {
      setupBellWithDOM();
      const bell = new Bell({
        enable: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      vi.spyOn(OneSignal.User.PushSubscription, 'optIn').mockResolvedValue();
      vi.spyOn(bell._message, '_display').mockResolvedValue();

      expect(bell._actionInProgress).toBe(false);
      const promise = bell._onSubscribeClick();
      expect(bell._actionInProgress).toBe(true);

      await promise;
      expect(bell._actionInProgress).toBe(false);
    });

    test('_onUnsubscribeClick sets actionInProgress during execution', async () => {
      setupBellWithDOM();
      const bell = new Bell({
        enable: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      vi.spyOn(OneSignal.User.PushSubscription, 'optOut').mockResolvedValue();
      vi.spyOn(bell._message, '_display').mockResolvedValue();

      expect(bell._actionInProgress).toBe(false);
      const promise = bell._onUnsubscribeClick();
      expect(bell._actionInProgress).toBe(true);

      await promise;
      expect(bell._actionInProgress).toBe(false);
    });

    test('subscription change uses silent setState when ignoreSubscriptionState', async () => {
      setupBellWithDOM();
      const bell = new Bell({
        enable: true,
        showLauncherAfter: 0,
        showBadgeAfter: 0,
      });
      await bell._create();

      bell._ignoreSubscriptionState = true;
      bell._dialog._notificationIcons = {
        chrome: null,
        firefox: null,
        safari: null,
      };
      const setStateSpy = vi.spyOn(bell, '_setState');

      OneSignal._emitter._emit(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, {
        current: { optedIn: true },
      });

      expect(setStateSpy).toHaveBeenCalledWith(BellState._Subscribed, true);
    });
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
