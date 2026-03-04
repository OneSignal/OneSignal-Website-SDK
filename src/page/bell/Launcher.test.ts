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

  test('_show adds active class', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    expect(launcher._shown).toBe(false);
    await launcher._show();
    expect(launcher._shown).toBe(true);
  });

  test('_show is a no-op when already shown', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    await launcher._show();
    const el = launcher._element!;
    const classCount = el.classList.length;
    await launcher._show();
    expect(el.classList.length).toBe(classCount);
  });

  test('_hide removes active class', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    await launcher._show();
    expect(launcher._shown).toBe(true);
    await launcher._hide();
    expect(launcher._shown).toBe(false);
  });

  test('_hide is a no-op when already hidden', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    expect(launcher._shown).toBe(false);
    await launcher._hide();
    expect(launcher._shown).toBe(false);
  });

  test('_activate removes inactive class', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    launcher._element?.classList.add('onesignal-bell-launcher-inactive');
    expect(launcher._active).toBe(false);
    await launcher._activate();
    expect(launcher._active).toBe(true);
  });

  test('_inactivate adds inactive class', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    expect(launcher._active).toBe(true);
    await launcher._inactivate();
    expect(launcher._active).toBe(false);
  });

  test('_resize sets CSS variables for each size', async () => {
    const launcher = new Launcher(new Bell({ enable: false }));
    const el = launcher._element!;

    await launcher._resize('small');
    expect(el.style.getPropertyValue('--bell-size')).toBe('32px');
    expect(el.style.getPropertyValue('--bell-inactive-scale')).toBe('1');
    expect(el.style.getPropertyValue('--badge-font-size')).toBe('8px');

    await launcher._resize('medium');
    expect(el.style.getPropertyValue('--bell-size')).toBe('48px');
    expect(el.style.getPropertyValue('--bell-inactive-scale')).toBe(`${32 / 48}`);
    expect(el.style.getPropertyValue('--badge-font-size')).toBe('12px');

    await launcher._resize('large');
    expect(el.style.getPropertyValue('--bell-size')).toBe('64px');
    expect(el.style.getPropertyValue('--bell-inactive-scale')).toBe('0.5');
    expect(el.style.getPropertyValue('--badge-font-size')).toBe('12px');
  });

  test('_resize throws when element is missing', async () => {
    document.body.innerHTML = '';
    const launcher = new Launcher(new Bell({ enable: false }));
    await expect(launcher._resize('medium')).rejects.toThrow('Missing DOM element');
  });
});
