import { beforeEach, describe, expect, test } from 'vitest';
import Badge from './Badge';

describe('Badge', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-badge"></div>
    `;
    // Ensure optional OneSignal global doesn't explode when accessed
    // Badge._show calls OneSignal?._notifyButton via optional chaining
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).OneSignal = (globalThis as any).OneSignal ?? {};
  });

  test('_updateCount increments and clamps to empty when <= 0', () => {
    const badge = new Badge();
    // Start at empty, increment twice
    badge['_content'] = '';
    badge['_increment']();
    expect(badge['_content']).toBe('1');
    badge['_increment']();
    expect(badge['_content']).toBe('2');

    // Decrement twice → goes to 0 and clears to empty string
    badge['_decrement']();
    expect(badge['_content']).toBe('1');
    badge['_decrement']();
    expect(badge['_content']).toBe('');
  });
});


