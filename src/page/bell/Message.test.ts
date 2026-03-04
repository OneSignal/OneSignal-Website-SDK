import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockDelay } from '__test__/support/helpers/setup';
import Bell from './Bell';
import { BellState } from './constants';
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

  test('_getTipForState returns correct message per state', () => {
    const bell = new Bell({ enable: false });
    const message = new Message(bell);

    bell._setState(BellState._Unsubscribed, true);
    expect(message._getTipForState()).toBe('Subscribe to notifications');

    bell._setState(BellState._Subscribed, true);
    expect(message._getTipForState()).toBe("You're subscribed to notifications");

    bell._setState(BellState._Blocked, true);
    expect(message._getTipForState()).toBe("You've blocked notifications");

    bell._setState(BellState._Uninitialized, true);
    expect(message._getTipForState()).toBe('');
  });
});
