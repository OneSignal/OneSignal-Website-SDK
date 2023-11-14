import { TestEnvironment } from '../../support/environment/TestEnvironment';
import EventHelper from '../../../src/shared/helpers/EventHelper';

describe('Notification Events', () => {
  beforeEach(async () => {
    TestEnvironment.initialize();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Adding click listener fires internal EventHelper', async () => {
    const stub = test.stub(
      EventHelper,
      'fireStoredNotificationClicks',
      null,
    );
    OneSignal.Notifications.addEventListener('click', null);
    expect(stub).toHaveBeenCalledTimes(1);
  });
});
