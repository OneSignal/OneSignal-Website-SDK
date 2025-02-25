import bowser from 'bowser';
import { DOMWindow, JSDOM, ResourceLoader } from 'jsdom';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import NotificationsNamespace from '../../../src/onesignal/NotificationsNamespace';
import OneSignal from '../../../src/onesignal/OneSignal';
import { ONESIGNAL_EVENTS } from '../../../src/onesignal/OneSignalEvents';
import UserNamespace from '../../../src/onesignal/UserNamespace';
import Context from '../../../src/page/models/Context';
import { getSlidedownElement } from '../../../src/page/slidedown/SlidedownElement';
import Emitter from '../../../src/shared/libraries/Emitter';
import Database from '../../../src/shared/services/Database';
import { CUSTOM_LINK_CSS_CLASSES } from '../../../src/shared/slidedown/constants';
import * as bowerCastleHelpers from '../../../src/shared/utils/bowserCastle';
import MockNotification from '../mocks/MockNotification';
import BrowserUserAgent from '../models/BrowserUserAgent';
import Random from '../utils/Random';
import TestContext from './TestContext';
import { TestEnvironmentConfig } from './TestEnvironment';

declare const global: any;

vi.mock('../../../src/shared/utils/bowserCastle', () => ({
  bowserCastle: vi.fn(),
}));
const bowserCastleSpy = vi.spyOn(bowerCastleHelpers, 'bowserCastle');

export function resetDatabase() {
  // Erase and reset IndexedDb database name to something random
  Database.resetInstance();
  Database.databaseInstanceName = Random.getRandomString(10);
}

export function mockUserAgent(config: TestEnvironmentConfig = {}): void {
  const info = bowser._detect(config.userAgent ?? BrowserUserAgent.Default);

  // Modify the mock implementation
  bowserCastleSpy.mockReturnValue({
    mobile: info.mobile,
    tablet: info.tablet,
    name: info.name.toLowerCase(),
    version: info.version,
  });
}

export async function initOSGlobals(config: TestEnvironmentConfig = {}) {
  global.OneSignal = OneSignal;
  global.OneSignal.EVENTS = ONESIGNAL_EVENTS;
  global.OneSignal.config = TestContext.getFakeMergedConfig(config);
  global.OneSignal.context = new Context(global.OneSignal.config);
  global.OneSignal.initialized = true;
  global.OneSignal.emitter = new Emitter();
  const core = new CoreModule();
  await core.init();
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
    userAgent: config.userAgent ? config.userAgent : BrowserUserAgent.Default,
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
