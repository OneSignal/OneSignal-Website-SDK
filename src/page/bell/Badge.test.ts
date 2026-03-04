import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { vi } from 'vitest';
import Badge from './Badge';

describe('Badge', () => {
  let badge: Badge;

  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML =
      '<div class="onesignal-bell-launcher-badge"></div>';
    badge = new Badge();
  });

  test('_content gets and sets textContent', () => {
    expect(badge._content).toBe('');
    badge._content = 'test';
    expect(badge._content).toBe('test');
  });

  test('_content returns empty string when element missing', () => {
    document.body.innerHTML = '';
    expect(badge._content).toBe('');
  });

  test('_shown reflects opened class', () => {
    expect(badge._shown).toBe(false);
    badge._element!.classList.add('onesignal-bell-launcher-badge-opened');
    expect(badge._shown).toBe(true);
  });

  test('_show adds opened class and applies custom colors', async () => {
    const colorSpy = vi.fn();
    OneSignal._notifyButton = { _setCustomColorsIfSpecified: colorSpy } as never;

    await badge._show();
    expect(badge._shown).toBe(true);
    expect(colorSpy).toHaveBeenCalled();
  });

  test('_show is a no-op when already shown', async () => {
    const colorSpy = vi.fn();
    OneSignal._notifyButton = { _setCustomColorsIfSpecified: colorSpy } as never;

    await badge._show();
    await badge._show();
    expect(colorSpy).toHaveBeenCalledTimes(1);
  });

  test('_hide removes opened class', async () => {
    await badge._show();
    expect(badge._shown).toBe(true);
    await badge._hide();
    expect(badge._shown).toBe(false);
  });

  test('_hide is a no-op when already hidden', async () => {
    expect(badge._shown).toBe(false);
    await badge._hide();
    expect(badge._shown).toBe(false);
  });

  test('_updateCount increments and clamps to empty when <= 0', () => {
    badge._increment();
    expect(badge._content).toBe('1');
    badge._increment();
    expect(badge._content).toBe('2');

    badge._decrement();
    expect(badge._content).toBe('1');
    badge._decrement();
    expect(badge._content).toBe('');
  });
});
