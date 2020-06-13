import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import Popover from '../../../src/popover/Popover';
import { SlidedownPermissionMessageOptions } from '../../../src/models/Prompts';
import "../../support/polyfills/polyfills";
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { setUserAgent } from '../../support/tester/browser';

let sandbox: SinonSandbox = sinon.sandbox.create();

const options: SlidedownPermissionMessageOptions = {
  actionMessage : '',
  acceptButtonText : '',
  cancelButtonText : '',
  enabled : true
}

test.beforeEach(async () => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test.afterEach(function () {
  sandbox.restore();
});

/**
 * chrome tests
 */
test('popover: uses chrome by default on mac', async t => {
  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {chrome: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses chrome by default on tablet', async t => {
  setUserAgent(BrowserUserAgent.ChromeTabletSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {chrome: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses chrome by default on linux', async t => {
  setUserAgent(BrowserUserAgent.ChromeLinuxSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {chrome: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses chrome by default on windows', async t => {
  setUserAgent(BrowserUserAgent.ChromeAndroidSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {chrome: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * firefox tests
 */
test('popover: uses firefox by default on mobile', async t => {
  setUserAgent(BrowserUserAgent.FirefoxMobileSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {firefox: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses firefox by default on tablet', async t => {
  setUserAgent(BrowserUserAgent.FirefoxTabletSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {firefox: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses firefox by default on windows', async t => {
  setUserAgent(BrowserUserAgent.FirefoxWindowsSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {firefox: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses firefox by default on mac', async t => {
  setUserAgent(BrowserUserAgent.FirefoxMacSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {firefox: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('popover: uses firefox by default on linux', async t => {
  setUserAgent(BrowserUserAgent.FirefoxLinuxSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {firefox: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * edge test
 */
test('popover: uses edge by default', async t => {
  setUserAgent(BrowserUserAgent.EdgeSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {chrome: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * samsung test
 */
test('popover: uses samsung browser by default', async t => {
  setUserAgent(BrowserUserAgent.SamsungBrowserSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {chrome: "http://url.com"};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * default catch tests
 */
test('popover: uses samsung browser by default w/ icons undefined', async t => {
  setUserAgent(BrowserUserAgent.SamsungBrowserSupported);
  const popover = new Popover(options);

  popover.notificationIcons = undefined;
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "default-icon");
});

test('popover: uses samsung browser by default w/ empty icons object', async t => {
  setUserAgent(BrowserUserAgent.SamsungBrowserSupported);
  const popover = new Popover(options);

  popover.notificationIcons = {};
  const icon = popover.getPlatformNotificationIcon();

  t.is(icon, "default-icon");
});