import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { describe, test, expect, beforeEach, vi } from 'vite-plus/test';

import Bell from './Bell';
import Launcher from './Launcher';

describe('Launcher', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher"></div>
    `;
  });

  test('_show adds active class', () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    expect(launcher._shown).toBe(false);
    launcher._show();
    expect(launcher._shown).toBe(true);
  });

  test('_show is a no-op when already shown', () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    launcher._show();
    const el = launcher._element!;
    const classCount = el.classList.length;
    launcher._show();
    expect(el.classList.length).toBe(classCount);
  });

  test('_hide removes active class', () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    launcher._show();
    expect(launcher._shown).toBe(true);
    launcher._hide();
    expect(launcher._shown).toBe(false);
  });

  test('_hide closes dialog popover', () => {
    const bell = new Bell({ enable: false });
    const launcher = new Launcher(bell);
    const dialogHide = vi.spyOn(bell._dialog, '_hide');
    launcher._show();
    launcher._hide();
    expect(dialogHide).toHaveBeenCalled();
  });

  test('_hide is a no-op when already hidden', () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    expect(launcher._shown).toBe(false);
    launcher._hide();
    expect(launcher._shown).toBe(false);
  });

  test('_resize sets CSS variables for each size', () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    const el = launcher._element!;

    launcher._resize('small');
    expect(el.style.getPropertyValue('--bell-size')).toBe('32px');
    expect(el.style.getPropertyValue('--bell-resting-scale')).toBe('1');
    expect(el.style.getPropertyValue('--badge-font-size')).toBe('8px');

    launcher._resize('medium');
    expect(el.style.getPropertyValue('--bell-size')).toBe('48px');
    expect(el.style.getPropertyValue('--bell-resting-scale')).toBe(`${32 / 48}`);
    expect(el.style.getPropertyValue('--badge-font-size')).toBe('12px');

    launcher._resize('large');
    expect(el.style.getPropertyValue('--bell-size')).toBe('64px');
    expect(el.style.getPropertyValue('--bell-resting-scale')).toBe('0.5');
    expect(el.style.getPropertyValue('--badge-font-size')).toBe('12px');
  });

  test('_resize throws when element is missing', () => {
    document.body.innerHTML = '';
    const launcher = new Launcher(new Bell({ enable: false }));
    expect(() => launcher._resize('medium')).toThrow('Missing DOM element');
  });
});
