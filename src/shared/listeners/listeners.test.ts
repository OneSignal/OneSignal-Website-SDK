import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import * as eventListeners from 'src/shared/listeners';

describe('Notification Listeners', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Adding click listener fires internal EventHelper', async () => {
    const stub = vi.spyOn(eventListeners, 'fireStoredNotificationClicks');
    // @ts-expect-error - listener doesnt matter
    OneSignal.Notifications.addEventListener('click', null);
    expect(stub).toHaveBeenCalledTimes(1);
  });
});
