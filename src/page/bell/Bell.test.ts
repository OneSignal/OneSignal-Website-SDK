import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import Bell from './Bell';

describe('Bell', () => {
  beforeEach(() => {
    // Set up OneSignal globals/context to avoid accidental runtime lookups
    TestEnvironment.initialize({ initOneSignalId: false });
  });

  test('constructor early-returns when enable=false and applies defaults', () => {
    const spyInstall = vi.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Bell.prototype as any),
      '_installEventHooks',
    );
    const spyUpdate = vi.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Bell.prototype as any),
      '_updateState',
    );

    const bell = new Bell({ enable: false });
    expect(bell._options.size).toBe('medium');
    expect(bell._options.position).toBe('bottom-right');
    expect(bell._options.theme).toBe('default');
    expect(spyInstall).not.toHaveBeenCalled();
    expect(spyUpdate).not.toHaveBeenCalled();
  });

  test('constructor validates and installs hooks when enable=true', () => {
    const spyInstall = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(Bell.prototype as any, '_installEventHooks')
      .mockImplementation(() => undefined);
    const spyUpdate = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(Bell.prototype as any, '_updateState')
      .mockImplementation(() => undefined);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bell as any)._setState(1 /* _Subscribed */);
    expect(trigger).toHaveBeenCalled();
  });
});


