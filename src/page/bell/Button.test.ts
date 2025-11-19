import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Bell from './Bell';
import Button from './Button';
import { MessageType } from './constants';

describe('Button', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher-button"></div>
      <div class="onesignal-bell-launcher-message"></div>
    `;
    TestEnvironment.initialize();
  });

  test('_onClick concurrency guard and early-return when message showing', async () => {
    const bell = new Bell({ enable: false });
    const button = new Button(bell);

    // Simulate message being shown of type Message by adding the show class
    const msgEl = document.querySelector(
      '.onesignal-bell-launcher-message',
    ) as HTMLElement;
    msgEl.classList.add('onesignal-bell-launcher-message-opened');
    bell['_message']['_contentType'] = MessageType._Message;

    const toggleSpy = vi.spyOn(button, '_toggleDialog');

    // Force concurrent scenario: set handling to true then call
    button['_isHandlingClick'] = false;
    await button['_onClick']();
    expect(toggleSpy).not.toHaveBeenCalled();
    expect(button['_isHandlingClick']).toBe(false);
  });
});
