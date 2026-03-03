import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Bell from './Bell';
import Launcher from './Launcher';

describe('Launcher', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher"></div>
    `;
  });

  test('_activate removes inactive class', async () => {
    const bell = new Bell({ enable: false });
    const launcher = new Launcher(bell);

    launcher._element?.classList.add('onesignal-bell-launcher-inactive');
    expect(launcher._active).toBe(false);
    await launcher._activate();
    expect(launcher._active).toBe(true);
  });

  test('_inactivate adds inactive class and resizes to small', async () => {
    const bell = new Bell({ enable: false });
    const launcher = new Launcher(bell);

    expect(launcher._active).toBe(true);
    launcher._element?.classList.add('onesignal-bell-launcher-md');
    await launcher._inactivate();
    expect(launcher._active).toBe(false);
    expect(launcher._element?.classList.contains('onesignal-bell-launcher-sm')).toBe(true);
  });
});
