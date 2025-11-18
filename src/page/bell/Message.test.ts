import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Bell from './Bell';
import Message from './Message';

describe('Message', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-message">
        <div class="onesignal-bell-launcher-message-body"></div>
      </div>
      <div class="onesignal-bell-launcher-badge"></div>
    `;
    // Polyfill Web Animations API method used by AnimatedElement
    HTMLElement.prototype.getAnimations = () => [];
    vi.useFakeTimers();
  });

  test('_display shows then hides after duration and resets content type', async () => {
    const bell = new Bell({ enable: false });
    const message = new Message(bell);
    const promise = message['_display']('message', 'Hello', 1000);
    // advance timers to cover delay
    await vi.runAllTimersAsync();
    await promise;
    // After display finishes, contentType should reset to 'tip'
    expect(message['_contentType']).toBe('tip');
    expect(message['_shown']).toBe(false);
  });
});
