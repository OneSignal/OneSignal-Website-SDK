import EventHelper from '../../../src/shared/helpers/EventHelper';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';
import { DUMMY_PUSH_TOKEN } from '../../support/constants';
import { initializeWithPermission } from '../../support/helpers/pushSubscription';
import { PermissionManager } from '../../support/managers/PermissionManager';

// TODO: Revisit with later Web SDK Prs
describe.skip('Notification Types are set correctly on subscription change', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.spyOn(MainHelper, 'getCurrentPushToken').mockResolvedValue(
      DUMMY_PUSH_TOKEN,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('When native permission is rejected, we update notification_types to 0 & enabled to false', async () => {
    await initializeWithPermission('granted');

    // mimick native permission change
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Denied,
    );
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
    await EventHelper.checkAndTriggerSubscriptionChanged();

    // check that the set function was called at least once with the correct value
    // expect(osModelSetSpy).toHaveBeenCalledWith(
    //   'notification_types',
    //   SubscriptionStateKind.NoNativePermission,
    // );
    // expect(osModelSetSpy).toHaveBeenCalledWith('enabled', false);
  });

  test('When native permission is accepted, we update notification_types to 1 & enabled to true', async () => {
    await initializeWithPermission('denied');
    // const osModelSetSpy = vi.spyOn(OSModel.prototype, 'set');

    // mimick native permission change
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Granted,
    );
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
    await EventHelper.checkAndTriggerSubscriptionChanged();

    // check that the set function was called at least once with the correct value
    // expect(osModelSetSpy).toHaveBeenCalledWith(
    //   'notification_types',
    //   SubscriptionStateKind.Subscribed,
    // );
    // expect(osModelSetSpy).toHaveBeenCalledWith('enabled', true);
  });
});
