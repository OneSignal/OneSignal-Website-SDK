import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Badge from './Badge';

describe('Badge', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-badge"></div>
    `;
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
