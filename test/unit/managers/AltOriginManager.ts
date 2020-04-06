import '../../support/polyfills/polyfills';
import test from "ava";
import AltOriginManager from '../../../src/managers/AltOriginManager';
import { EnvironmentKind } from '../../../src/models/EnvironmentKind'
import sinon from 'sinon';
import ProxyFrameHost from '../../../src/modules/frames/ProxyFrameHost';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';

test(`should get correct canonical subscription URL for development environment`, async t => {
  const config = TestEnvironment.getFakeAppConfig();
  config.subdomain = 'test';
  config.httpUseOneSignalCom = true;

  const devUrlsOsTcDomain = AltOriginManager.getCanonicalSubscriptionUrls(config, EnvironmentKind.Development);
  t.is(devUrlsOsTcDomain.length, 2);
  t.is(devUrlsOsTcDomain[0].host, new URL('https://test.localhost:3001').host);
  t.is(devUrlsOsTcDomain[1].host, new URL('https://test.os.tc:3001').host);

  config.httpUseOneSignalCom = false;

  const devUrls = AltOriginManager.getCanonicalSubscriptionUrls(config, EnvironmentKind.Development);
  t.is(devUrls.length, 1);
  t.is(devUrls[0].host, new URL('https://test.os.tc:3001').host);
});

test(`should get correct canonical subscription URL for staging environment`, async t => {
  const config = TestEnvironment.getFakeAppConfig();
  config.subdomain = 'test';
  config.httpUseOneSignalCom = true;

  const browser = await TestEnvironment.stubDomEnvironment();
  browser.changeURL(window, "http://staging-01.onesignal.com");

  const stagingUrlsOsTcDomain = AltOriginManager.getCanonicalSubscriptionUrls(config, EnvironmentKind.Staging);
  t.is(stagingUrlsOsTcDomain.length, 2);
  t.is(stagingUrlsOsTcDomain[0].host, new URL('https://test.localhost').host);
  t.is(stagingUrlsOsTcDomain[1].host, new URL('https://test.os.tc').host);

  config.httpUseOneSignalCom = false;

  const stagingUrls = AltOriginManager.getCanonicalSubscriptionUrls(config, EnvironmentKind.Staging);
  t.is(stagingUrls.length, 1);
  t.is(stagingUrls[0].host, new URL('https://test.os.tc').host);
});

test(`should get correct canonical subscription URL for production environment`, async t => {
  const config = TestEnvironment.getFakeAppConfig();
  config.subdomain = 'test';
  config.httpUseOneSignalCom = true;

  const prodUrlsOsTcDomain = AltOriginManager.getCanonicalSubscriptionUrls(config, EnvironmentKind.Production);
  t.is(prodUrlsOsTcDomain.length, 2);
  t.is(prodUrlsOsTcDomain[0].host, new URL('https://test.onesignal.com').host);
  t.is(prodUrlsOsTcDomain[1].host, new URL('https://test.os.tc').host);

  config.httpUseOneSignalCom = false;
  
  const prodUrls = AltOriginManager.getCanonicalSubscriptionUrls(config, EnvironmentKind.Production);
  t.is(prodUrls.length, 1);
  t.is(prodUrls[0].host, new URL('https://test.os.tc').host);
});

function setupDiscoverAltOriginTest(t: any) {
  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.subdomain = 'test';
  appConfig.httpUseOneSignalCom = true;

  t.context.appConfig = appConfig;
  t.context.subdomainOneSignalHost = `${appConfig.subdomain}.onesignal.com`;
  t.context.subdomainOsTcHost = `${appConfig.subdomain}.os.tc`;

  t.context.stubIsSubscribedToOneSignalImpl = async function() {
    if (this.url.host === t.context.subdomainOneSignalHost) {
      return true;
    } else return false;
  }

  t.context.stubIsSubscribedToOsTcImpl = async function() {
    if (this.url.host === t.context.subdomainOsTcHost) {
      return true;
    } else return false;
  }

  t.context.stubIsSubscribedToNoneImpl = async function() {
    return false;
  }

  t.context.stubIsSubscribedToBothImpl = async function() {
    if (this.url.host === t.context.subdomainOneSignalHost ||
      this.url.host === t.context.subdomainOsTcHost) {
      return true;
    } else return false;
  }
}

test(`should discover alt origin to be subdomain.onesignal.com if user is already subscribed there`, async t => {
  setupDiscoverAltOriginTest(t);
  const { appConfig } = t.context;
  const stubLoad = sinon.stub(ProxyFrameHost.prototype, 'load').resolves(undefined);
  const stubIsSubscribed = sinon.stub(ProxyFrameHost.prototype, 'isSubscribed').callsFake(t.context.stubIsSubscribedToOneSignalImpl);
  const stubRemoveDuplicatedAltOriginSubscription = sinon.stub(AltOriginManager, 'removeDuplicatedAltOriginSubscription').resolves(undefined);

  const proxyFrame = await AltOriginManager.discoverAltOrigin(appConfig);
  t.is(proxyFrame.url.host, t.context.subdomainOneSignalHost);

  stubRemoveDuplicatedAltOriginSubscription.restore();
  stubIsSubscribed.restore();
  stubLoad.restore();
});

test(`should discover alt origin to be subdomain.os.tc if user is not subscribed to onesignal.com but is subscribed to os.tc`, async t => {
  setupDiscoverAltOriginTest(t);
  const { appConfig } = t.context;
  const stubLoad = sinon.stub(ProxyFrameHost.prototype, 'load').resolves(undefined);
  const stubIsSubscribed = sinon.stub(ProxyFrameHost.prototype, 'isSubscribed').callsFake(t.context.stubIsSubscribedToOsTcImpl);
  const stubRemoveDuplicatedAltOriginSubscription = sinon.stub(AltOriginManager, 'removeDuplicatedAltOriginSubscription').resolves(undefined);

  const proxyFrame = await AltOriginManager.discoverAltOrigin(appConfig);
  t.is(proxyFrame.url.host, t.context.subdomainOsTcHost);

  stubRemoveDuplicatedAltOriginSubscription.restore();
  stubIsSubscribed.restore();
  stubLoad.restore();
});

test(`should discover alt origin to be subdomain.os.tc if user is not subscribed to either onesignal.com or os.tc`, async t => {
  setupDiscoverAltOriginTest(t);
  const { appConfig } = t.context;
  const stubLoad = sinon.stub(ProxyFrameHost.prototype, 'load').resolves(undefined);
  const stubIsSubscribed = sinon.stub(ProxyFrameHost.prototype, 'isSubscribed').callsFake(t.context.stubIsSubscribedToNoneImpl);
  const stubRemoveDuplicatedAltOriginSubscription = sinon.stub(AltOriginManager, 'removeDuplicatedAltOriginSubscription').resolves(undefined);

  const proxyFrame = await AltOriginManager.discoverAltOrigin(appConfig);
  t.is(proxyFrame.url.host, t.context.subdomainOsTcHost);

  stubRemoveDuplicatedAltOriginSubscription.restore();
  stubIsSubscribed.restore();
  stubLoad.restore();
});

test(`should discover alt origin to be subdomain.os.tc if user is subscribed to both onesignal.com and os.tc`, async t => {
  setupDiscoverAltOriginTest(t);
  const { appConfig } = t.context;
  const stubLoad = sinon.stub(ProxyFrameHost.prototype, 'load').resolves(undefined);
  const stubIsSubscribed = sinon.stub(ProxyFrameHost.prototype, 'isSubscribed').callsFake(t.context.stubIsSubscribedToBothImpl);
  const stubUnsubscribeFromPush = sinon.stub(ProxyFrameHost.prototype, 'unsubscribeFromPush').resolves(undefined);

  const proxyFrame = await AltOriginManager.discoverAltOrigin(appConfig);
  t.is(proxyFrame.url.host, t.context.subdomainOsTcHost);
  t.true(stubUnsubscribeFromPush.called);

  stubUnsubscribeFromPush.restore();
  stubIsSubscribed.restore();
  stubLoad.restore();
});

