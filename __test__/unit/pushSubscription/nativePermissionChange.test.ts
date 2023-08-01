import MainHelper from "../../../src/shared/helpers/MainHelper";
import ModelCache from "../../../src/core/caching/ModelCache";
import { OSModel } from '../../../src/core/modelRepo/OSModel'
import EventHelper from "../../../src/shared/helpers/EventHelper";
import { DUMMY_PUSH_TOKEN } from "../../support/constants";
import { initializeWithPermission } from "../../support/helpers/pushSubscription";
import { PermissionManager } from "../../support/managers/PermissionManager";
import { NotificationPermission } from "../../../src/shared/models/NotificationPermission";

describe('Notification Types are set correctly on subscription change', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    test.stub(MainHelper, 'getCurrentPushToken', DUMMY_PUSH_TOKEN);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('When native permission is rejected, we update notification_types to -2 & enabled to false', async () => {
    await initializeWithPermission('granted');
    const osModelSetSpy = jest.spyOn(OSModel.prototype, 'set');

    // mimick native permission change
    await PermissionManager.mockNotificationPermissionChange(test, NotificationPermission.Denied);
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
    await EventHelper.checkAndTriggerSubscriptionChanged();

    // check that the set function was called at least once with the correct value
    expect(osModelSetSpy).toHaveBeenCalledWith('notification_types', -2);
    expect(osModelSetSpy).toHaveBeenCalledWith('enabled', false);
  });

  test('When native permission is accepted, we update notification_types to 1 & enabled to true', async () => {
    await initializeWithPermission('denied');
    const osModelSetSpy = jest.spyOn(OSModel.prototype, 'set');

    // mimick native permission change
    await PermissionManager.mockNotificationPermissionChange(test, NotificationPermission.Granted);
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
    await EventHelper.checkAndTriggerSubscriptionChanged();

    // check that the set function was called at least once with the correct value
    expect(osModelSetSpy).toHaveBeenCalledWith('notification_types', 1);
    expect(osModelSetSpy).toHaveBeenCalledWith('enabled', true);
  });
});
