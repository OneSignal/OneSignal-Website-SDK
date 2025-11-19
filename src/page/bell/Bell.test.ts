import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import Bell from './Bell';

describe('Bell', () => {
  // @ts-expect-error - _installEventHooks is not assignable
  const spyInstall = vi.spyOn(Bell.prototype, '_installEventHooks');
  const spyUpdate = vi.spyOn(Bell.prototype, '_updateState');

  beforeEach(() => {
    // Set up OneSignal globals/context to avoid accidental runtime lookups
    TestEnvironment.initialize();
  });

  test('constructor early-returns when enable=false and applies defaults', () => {
    const bell = new Bell({ enable: false });
    expect(bell._options.size).toBe('medium');
    expect(bell._options.position).toBe('bottom-right');
    expect(bell._options.theme).toBe('default');
    expect(spyInstall).not.toHaveBeenCalled();
    expect(spyUpdate).not.toHaveBeenCalled();
  });

  test('constructor validates and installs hooks when enable=true', () => {
    // Valid non-defaults to ensure validation path runs
    const bell = new Bell({
      enable: true,
      size: 'small',
      position: 'bottom-left',
      theme: 'inverse',
      showBadgeAfter: 10,
      showLauncherAfter: 1,
    });
    expect(bell).toBeTruthy();
    expect(spyInstall).toHaveBeenCalledTimes(1);
    expect(spyUpdate).toHaveBeenCalledTimes(1);
  });

  test('_setState triggers event when changed', () => {
    const bell = new Bell({ enable: false });
    const trigger = vi.spyOn(OneSignalEvent, '_trigger');
    // transition should emit
    bell._setState(1 /* _Subscribed */);
    expect(trigger).toHaveBeenCalled();
  });
});
