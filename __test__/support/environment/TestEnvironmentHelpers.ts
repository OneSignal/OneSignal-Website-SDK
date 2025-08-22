import CoreModule from 'src/core/CoreModule';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { ModelChangeTags } from 'src/core/types/models';
import { setPushToken } from 'src/shared/database/subscription';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import NotificationsNamespace from '../../../src/onesignal/NotificationsNamespace';
import OneSignal from '../../../src/onesignal/OneSignal';
import { ONESIGNAL_EVENTS } from '../../../src/onesignal/OneSignalEvents';
import UserNamespace from '../../../src/onesignal/UserNamespace';
import Context from '../../../src/page/models/Context';
import Emitter from '../../../src/shared/libraries/Emitter';
import { BASE_SUB, ONESIGNAL_ID, SUB_ID_3 } from '../../constants';
import MockNotification from '../mocks/MockNotification';
import TestContext from './TestContext';
import { type TestEnvironmentConfig } from './TestEnvironment';

declare const global: any;

export function initOSGlobals(config: TestEnvironmentConfig = {}) {
  global.OneSignal = OneSignal;
  global.OneSignal.EVENTS = ONESIGNAL_EVENTS;
  global.OneSignal.config = TestContext.getFakeMergedConfig(config);
  global.OneSignal.context = new Context(global.OneSignal.config);
  global.OneSignal.initialized = true;
  global.OneSignal.emitter = new Emitter();
  const core = new CoreModule();
  global.OneSignal.coreDirector = new CoreModuleDirector(core);
  global.OneSignal.User = new UserNamespace(
    !!config.initUserAndPushSubscription,
  ); // TO DO: pass in subscription, and permission
  global.OneSignal.Notifications = new NotificationsNamespace(
    config.permission,
  );

  return global.OneSignal;
}

export function stubNotification(config: TestEnvironmentConfig) {
  global.Notification = MockNotification;
  global.Notification.permission = config.permission
    ? config.permission
    : global.Notification.permission;
}

export const createPushSub = ({
  id = SUB_ID_3,
  token = 'push-token',
  onesignalId = ONESIGNAL_ID,
}: {
  id?: string;
  token?: string;
  onesignalId?: string;
} = {}) => {
  const pushSubscription = new SubscriptionModel();
  pushSubscription.initializeFromJson({
    ...BASE_SUB,
    id,
    onesignalId,
    token,
    type: SubscriptionType.ChromePush,
  });
  return pushSubscription;
};

export const setupSubModelStore = async ({
  id,
  token,
  onesignalId,
  web_auth,
  web_p256,
}: {
  id?: string;
  token?: string;
  onesignalId?: string;
  web_auth?: string;
  web_p256?: string;
} = {}) => {
  const pushModel = createPushSub({
    id,
    token,
    onesignalId,
  });
  if (web_auth) {
    pushModel.web_auth = web_auth;
  }
  if (web_p256) {
    pushModel.web_p256 = web_p256;
  }
  await setPushToken(pushModel.token);
  OneSignal.coreDirector.subscriptionModelStore.replaceAll(
    [pushModel],
    ModelChangeTags.NO_PROPAGATE,
  );

  return pushModel;
};
