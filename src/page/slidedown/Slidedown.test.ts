import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Bell from '../bell/Bell';
import { manageNotifyButtonStateWhileSlidedownShows } from './Slidedown';

function createBell() {
  return new Bell({ enable: true });
}

describe('manageNotifyButtonStateWhileSlidedownShows', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    document.body.innerHTML = `
      <div class="onesignal-bell-launcher">
        <div class="onesignal-bell-launcher-dialog" id="onesignal-bell-dialog" popover="auto">
          <div class="onesignal-bell-launcher-dialog-body"></div>
        </div>
      </div>
    `;
  });

  test('no-op when notify button is null', () => {
    OneSignal._notifyButton = null;
    manageNotifyButtonStateWhileSlidedownShows();
    expect(OneSignal._emitter._numberOfListeners('slidedownClosed')).toBe(0);
  });

  test('no-op when notify button is disabled', () => {
    OneSignal._notifyButton = new Bell({ enable: false });
    manageNotifyButtonStateWhileSlidedownShows();
    expect(OneSignal._emitter._numberOfListeners('slidedownClosed')).toBe(0);
  });

  test('hides shown launcher', async () => {
    const bell = createBell();
    await bell._launcher._show();
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(bell._launcher._shown).toBe(false);
  });

  test('restores launcher when slidedown closes', async () => {
    const bell = createBell();
    await bell._launcher._show();
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(bell._launcher._shown).toBe(false);

    await OneSignal._emitter._emit('slidedownClosed');
    expect(bell._launcher._shown).toBe(true);
  });

  test('registers restore listener even when launcher is not shown', () => {
    const bell = createBell();
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(bell._launcher._shown).toBe(false);
    expect(OneSignal._emitter._numberOfListeners('slidedownClosed')).toBe(1);
  });

  test('hides dialog popover when hiding launcher', async () => {
    const bell = createBell();
    await bell._launcher._show();
    const dialogHide = vi.spyOn(bell._dialog, '_hide');
    OneSignal._notifyButton = bell;

    manageNotifyButtonStateWhileSlidedownShows();
    expect(dialogHide).toHaveBeenCalled();
  });
});
