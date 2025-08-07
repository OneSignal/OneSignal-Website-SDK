import { type DOMWindow, JSDOM, ResourceLoader } from 'jsdom';
import CoreModule from 'src/core/CoreModule';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { ModelChangeTags } from 'src/core/types/models';
import { setPushId, setPushToken } from 'src/shared/database/subscription';
import {
  NotificationType,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import NotificationsNamespace from '../../../src/onesignal/NotificationsNamespace';
import OneSignal from '../../../src/onesignal/OneSignal';
import { ONESIGNAL_EVENTS } from '../../../src/onesignal/OneSignalEvents';
import UserNamespace from '../../../src/onesignal/UserNamespace';
import Context from '../../../src/page/models/Context';
import { getSlidedownElement } from '../../../src/page/slidedown/SlidedownElement';
import Emitter from '../../../src/shared/libraries/Emitter';
import { CUSTOM_LINK_CSS_CLASSES } from '../../../src/shared/slidedown/constants';
import {
  DEFAULT_USER_AGENT,
  DEVICE_OS,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID_3,
} from '../../constants';
import MockNotification from '../mocks/MockNotification';
import TestContext from './TestContext';
import { type TestEnvironmentConfig } from './TestEnvironment';

declare const global: any;

export async function initOSGlobals(config: TestEnvironmentConfig = {}) {
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

  // window is only defined in dom environment, not in SW
  if (config.environment === 'dom') {
    global.window.Notification = global.Notification;
  }
}

export async function stubDomEnvironment(config: TestEnvironmentConfig) {
  if (!config) {
    config = {};
  }

  let url = 'https://localhost:3001/webpush/sandbox?https=1';

  if (config.url) {
    url = config.url.toString();
    global.location = url;
  }

  let html = '<!doctype html><html><head></head><body></body></html>';

  if (config.addPrompts) {
    html = `<!doctype html><html><head>\
    <div class="${CUSTOM_LINK_CSS_CLASSES.containerClass}"></div>\
    <div class="${CUSTOM_LINK_CSS_CLASSES.containerClass}"></div>\
    </head><body>\
      ${getSlidedownElement({}).outerHTML}</div></body></html>`;
  }

  const resourceLoader = new ResourceLoader({
    userAgent: config.userAgent
      ? config.userAgent.toString()
      : DEFAULT_USER_AGENT.toString(),
  });

  // global document object must be defined for `getSlidedownElement` to work correctly.
  // this line initializes the document object
  const dom = new JSDOM(html, {
    resources: resourceLoader,
    url: url,
    contentType: 'text/html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const windowDef = dom.window;
  (windowDef as any).location = url;

  const windowTop: DOMWindow = windowDef;
  dom.reconfigure({ url, windowTop });
  global.window = windowDef;
  global.window.isSecureContext = true;
  global.document = windowDef.document;
  return dom;
}

export const createPushSub = ({
  id = DUMMY_SUBSCRIPTION_ID_3,
  token = 'push-token',
  onesignalId = DUMMY_ONESIGNAL_ID,
}: {
  id?: string;
  token?: string;
  onesignalId?: string;
} = {}) => {
  const pushSubscription = new SubscriptionModel();
  pushSubscription.initializeFromJson({
    device_model: '',
    device_os: DEVICE_OS,
    enabled: true,
    id,
    notification_types: NotificationType.Subscribed,
    onesignalId,
    token,
    sdk: __VERSION__,
    type: SubscriptionType.ChromePush,
  });
  return pushSubscription;
};

export const setupSubModelStore = async ({
  id,
  token,
  onesignalId,
}: {
  id?: string;
  token?: string;
  onesignalId?: string;
} = {}) => {
  const pushModel = createPushSub({
    id,
    token,
    onesignalId,
  });
  await setPushId(pushModel.id);
  await setPushToken(pushModel.token);
  OneSignal.coreDirector.subscriptionModelStore.replaceAll(
    [pushModel],
    ModelChangeTags.NO_PROPOGATE,
  );

  return pushModel;
};
