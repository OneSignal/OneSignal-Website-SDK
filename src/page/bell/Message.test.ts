import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockDelay } from '__test__/support/helpers/setup';
import Bell from './Bell';
import Message from './Message';

mockDelay();

describe('Message', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-message">
        <div class="onesignal-bell-launcher-message-body"></div>
      </div>
      <div class="onesignal-bell-launcher-badge"></div>
    `;
  });

  test('_display shows then hides after duration and resets content type', async () => {
    const bell = new Bell({ enable: false });
    const message = new Message(bell);
    await message._display('message', 'Hello', 1000);
    expect(message._contentType).toBe('tip');
    expect(message._shown).toBe(false);
  });
});
