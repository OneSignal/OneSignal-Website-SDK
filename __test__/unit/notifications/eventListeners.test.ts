import { TestEnvironment } from '../../support/environment/TestEnvironment';
import EventHelper from '../../../src/shared/helpers/EventHelper';

describe('Notification Events', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Adding click listener fires internal EventHelper', async () => {
    const stub = vi.spyOn(EventHelper, 'fireStoredNotificationClicks');
    OneSignal.Notifications.addEventListener('click', null);
    expect(stub).toHaveBeenCalledTimes(1);
  });
});
