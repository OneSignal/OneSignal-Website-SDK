import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Bell from './Bell';
import Button from './Button';

describe('Button', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <button class="onesignal-bell-launcher-button"></button>
    `;
  });

  test('_onClick adds pulsing class to button element', () => {
    const bell = new Bell({ enable: false });
    const button = new Button(bell);
    const el = document.querySelector(
      '.onesignal-bell-launcher-button',
    ) as HTMLElement;

    button._onClick();

    expect(el.classList.contains('pulsing')).toBe(true);
  });
});
