import Bell from './Bell';
import Launcher from './Launcher';

describe('Launcher', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher"></div>
    `;
    // Polyfill Web Animations API method used by AnimatedElement
    HTMLElement.prototype.getAnimations = () => [];
    // Minimal OneSignal to satisfy any optional accesses down the line
    (global as any).OneSignal = (global as any).OneSignal ?? {};
  });

  test('_activateIfInactive sets wasInactive and activates only when inactive', async () => {
    const bell = new Bell({ enable: false }); // disable side-effects
    const launcher = new Launcher(bell);

    // Mark element as inactive by adding inactive class
    launcher['_element']?.classList.add('onesignal-bell-launcher-inactive');
    expect(launcher['_active']).toBe(false);
    await launcher['_activateIfInactive']();
    expect(launcher['_wasInactive']).toBe(true);
    expect(launcher['_active']).toBe(true);

    // Calling again should be a no-op (remains active, wasInactive unchanged)
    await launcher['_activateIfInactive']();
    expect(launcher['_wasInactive']).toBe(true);
    expect(launcher['_active']).toBe(true);
  });

  test('_inactivateIfWasInactive only fires when previously inactive path set', async () => {
    const bell = new Bell({ enable: false });
    const launcher = new Launcher(bell);
    // Mark that it was activated from inactive state
    launcher['_wasInactive'] = true;

    await launcher['_inactivateIfWasInactive']();
    expect(launcher['_wasInactive']).toBe(false);
    expect(launcher['_active']).toBe(false);
  });
});
