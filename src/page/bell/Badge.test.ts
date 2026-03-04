import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
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

  test('_show adds opened class', () => {
    badge._show();
    expect(badge._shown).toBe(true);
  });

  test('_show is a no-op when already shown', () => {
    badge._show();
    badge._show();
    expect(badge._shown).toBe(true);
  });

  test('_hide removes opened class', () => {
    badge._show();
    expect(badge._shown).toBe(true);
    badge._hide();
    expect(badge._shown).toBe(false);
  });

  test('_hide is a no-op when already hidden', () => {
    expect(badge._shown).toBe(false);
    badge._hide();
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
