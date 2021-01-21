import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import Slidedown from '../../../src/slidedown/Slidedown';
import { SlidedownPromptOptions, DelayedPromptType } from '../../../src/models/Prompts';
import "../../support/polyfills/polyfills";
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { setUserAgent } from '../../support/tester/browser';

const sandbox: SinonSandbox = sinon.sandbox.create();

const options: SlidedownPromptOptions = {
  type: DelayedPromptType.Push,
  text: {
    actionMessage: '',
    acceptButton: '',
    cancelButton: ''
  },
  autoPrompt: true
};

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
test('slidedown: uses chrome by default on mac', async t => {
  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses chrome by default on tablet', async t => {
  setUserAgent(BrowserUserAgent.ChromeTabletSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses chrome by default on linux', async t => {
  setUserAgent(BrowserUserAgent.ChromeLinuxSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses chrome by default on windows', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses chrome by default on Android', async t => {
  setUserAgent(BrowserUserAgent.ChromeAndroidSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * firefox tests
 */
test('slidedown: uses firefox by default on mobile', async t => {
  setUserAgent(BrowserUserAgent.FirefoxMobileSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { firefox: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses firefox by default on tablet', async t => {
  setUserAgent(BrowserUserAgent.FirefoxTabletSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { firefox: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses firefox by default on windows', async t => {
  setUserAgent(BrowserUserAgent.FirefoxWindowsSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { firefox: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses firefox by default on mac', async t => {
  setUserAgent(BrowserUserAgent.FirefoxMacSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { firefox: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

test('slidedown: uses firefox by default on linux', async t => {
  setUserAgent(BrowserUserAgent.FirefoxLinuxSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { firefox: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * edge test
 */
test('slidedown: uses edge by default', async t => {
  setUserAgent(BrowserUserAgent.EdgeSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * samsung test
 */
test('slidedown: uses samsung browser by default, icon url defined', async t => {
  setUserAgent(BrowserUserAgent.SamsungBrowserSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = { chrome: "http://url.com" };
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "http://url.com");
});

/**
 * default catch tests
 */
test('slidedown: uses samsung browser by default, icon undefined', async t => {
  setUserAgent(BrowserUserAgent.SamsungBrowserSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = null;
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "default-icon");
});

test('slidedown: uses samsung browser by default, icon empty', async t => {
  setUserAgent(BrowserUserAgent.SamsungBrowserSupported);
  const slidedown = new Slidedown(options);

  slidedown.notificationIcons = {};
  const icon = slidedown.getPlatformNotificationIcon();

  t.is(icon, "default-icon");
});
