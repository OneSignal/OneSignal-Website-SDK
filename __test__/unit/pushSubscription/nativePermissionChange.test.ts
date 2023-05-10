import MainHelper from "../../../src/shared/helpers/MainHelper";
import ModelCache from "../../../src/core/caching/ModelCache";
import { OSModel } from '../../../src/core/modelRepo/OSModel'
import PermissionManager from "../../../src/shared/managers/PermissionManager";
import EventHelper from "../../../src/shared/helpers/EventHelper";
import { SubscriptionManager } from "../../../src/shared/managers/SubscriptionManager";
import { DUMMY_PUSH_TOKEN } from "../../support/constants";
import { initializeWithPermission } from "../../support/helpers/pushSubscription";

describe('Notification Types are set correctly on subscription change', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    test.stub(SubscriptionManager, 'isSafari', false)
    test.stub(MainHelper, 'getCurrentPushToken', DUMMY_PUSH_TOKEN);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('When native permission is rejected, we update notification_types to -2 & enabled to false', async () => {
    await initializeWithPermission('granted');
    test.stub(PermissionManager.prototype, 'getNotificationPermission', Promise.resolve('denied'));
    const osModelSetSpy = jest.spyOn(OSModel.prototype, 'set');

    const permissionChangeEventFiredPromise = new Promise(resolve => {
      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, resolve);
    });

    // mimick native permission change
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
    await EventHelper.checkAndTriggerSubscriptionChanged();

    await permissionChangeEventFiredPromise;

    // check that the set function was called at least once with the correct value
    expect(osModelSetSpy).toHaveBeenCalledWith('notification_types', -2);
    expect(osModelSetSpy).toHaveBeenCalledWith('enabled', false);
  });

  test('When native permission is accepted, we update notification_types to 1 & enabled to true', async () => {
    await initializeWithPermission('denied');
    test.stub(PermissionManager.prototype, 'getNotificationPermission', Promise.resolve('granted'));
    const osModelSetSpy = jest.spyOn(OSModel.prototype, 'set');

    const permissionChangeEventFiredPromise = new Promise(resolve => {
      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, resolve);
    });

    // mimick native permission change
    await MainHelper.checkAndTriggerNotificationPermissionChanged();
    await EventHelper.checkAndTriggerSubscriptionChanged();

    await permissionChangeEventFiredPromise;

    // check that the set function was called at least once with the correct value
    expect(osModelSetSpy).toHaveBeenCalledWith('notification_types', 1);
    expect(osModelSetSpy).toHaveBeenCalledWith('enabled', true);
  });
});
