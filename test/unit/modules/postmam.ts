import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import MainHelper from '../../../src/helpers/MainHelper';
import sinon from 'sinon';
import SubscriptionHelper from '../../../src/helpers/SubscriptionHelper';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { AppConfig } from '../../../src/models/AppConfig';

import Context from '../../../src/models/Context';
import { PageViewManager } from '../../../src/managers/PageViewManager';
import Postmam from '../../../src/Postmam';
import { contains } from '../../../src/utils';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  // Stub MessageChannel
  const fakeClass = class Test { };
  t.context.originalMessageChannel = (global as any).MessageChannel;
  (global as any).MessageChannel = fakeClass;

  t.context.expectedSafeHttpOrigins = [
    'http://site.com',
    'http://www.site.com',
    'https://site.com',
    'https://www.site.com'
  ];

  t.context.expectedSafeHttpsOrigins = [
    'https://site.com',
    'https://www.site.com'
  ];

  t.context.expectedSafeHttpOriginsForIrregularSubdomains = [
    'http://dev.www.site.com',
    'https://dev.www.site.com',
  ];

  t.context.expectedSafeHttpOriginsForReallyIrregularSubdomains = [
    'http://dev.www2-6.en.site.com',
    'http://www.dev.www2-6.en.site.com',
    'https://dev.www2-6.en.site.com',
    'https://www.dev.www2-6.en.site.com',
  ];
});

test.afterEach(async t => {
  (global as any).MessageChannel = t.context.originalMessageChannel;
});

/*
  When a developer chooses a site URL to integrate HTTP web push, multiple
  variants of his site origin will support prompting the user to subscribe
  because the final subscription takes place outside of his site origins on our
  subdomain of .os.tc.

  If a developer chooses to integrate HTTP web push on 'http://site.com', for
  example, the prefix variants 'http://', 'http://www.', 'https://', and
  'https://www.' will all support prompting the user. The user will still be
  subscribed on subdomain.os.tc though, and not on any one of the listed
  origins.

  The above changes if the developer chooses to integrate HTTP web push on
  'https://site.com'. A developer might be forced to integrate HTTP web push on
  an HTTPS site on platforms that don't allow uploading service worker files to
  the root, which is a required stpe. We assume the user only wants users to be
  prompted on the secure origins of his site, so we don't allow the 'http://'
  and 'http://www.' variants.

  For HTTPS web push, we want to restrict visitors to subscribing on only one
  single origin (the one listed on the dashboard web push config).
 */

test('should generate correct safe HTTP site origins for varying inputs of the same origin', async t => {
  const dashboardConfigSiteOrigins = [
    'http://site.com',
    'http://site.com/',
    'http://www.site.com',
    'http://www.site.com/'
  ];
  for (const dashboardConfigSiteOrigin of dashboardConfigSiteOrigins) {
    const postmam = new Postmam(window, dashboardConfigSiteOrigin, dashboardConfigSiteOrigin);
    for (const expectedSafeHttpOrigin of t.context.expectedSafeHttpOrigins) {
      t.true(postmam.isSafeOrigin(expectedSafeHttpOrigin));
    }
  }
});

test('should generate correct safe HTTPS site origins for varying inputs of the same origin', async t => {
  const dashboardConfigSiteOrigins = [
    'https://site.com',
    'https://site.com/',
    'https://www.site.com',
    'https://www.site.com/'
  ];
  for (const dashboardConfigSiteOrigin of dashboardConfigSiteOrigins) {
    const postmam = new Postmam(window, dashboardConfigSiteOrigin, dashboardConfigSiteOrigin);
    for (const expectedSafeHttpsOrigin of t.context.expectedSafeHttpsOrigins) {
      t.true(postmam.isSafeOrigin(expectedSafeHttpsOrigin));
    }
  }
});

test('should generate correct safe HTTP site origins for an origin with an irregular subdomain', async t => {
  const dashboardConfigSiteOrigins = [
    'http://dev.www.site.com',
    'http://dev.www.site.com/',
  ];
  for (const dashboardConfigSiteOrigin of dashboardConfigSiteOrigins) {
    const postmam = new Postmam(window, dashboardConfigSiteOrigin, dashboardConfigSiteOrigin);
    for (const expectedSafeHttpOrigin of t.context.expectedSafeHttpOriginsForIrregularSubdomains) {
      t.true(postmam.isSafeOrigin(expectedSafeHttpOrigin));
    }
  }
});

test('should generate correct safe HTTP site origins for an origin with a really irregular subdomain', async t => {
  const dashboardConfigSiteOrigins = [
    'http://dev.www2-6.en.site.com',
    'http://dev.www2-6.en.site.com/',
    'http://www.dev.www2-6.en.site.com',
    'http://www.dev.www2-6.en.site.com/',
  ];
  for (const dashboardConfigSiteOrigin of dashboardConfigSiteOrigins) {
    const postmam = new Postmam(window, dashboardConfigSiteOrigin, dashboardConfigSiteOrigin);
    for (const expectedSafeHttpOrigin of t.context.expectedSafeHttpOriginsForReallyIrregularSubdomains) {
      t.true(postmam.isSafeOrigin(expectedSafeHttpOrigin));
    }
  }
});

test('should generate no safe origins for an invalid origin', async t => {
  const dashboardConfigSiteOrigins = [
    'http://*.google.com',
    'asdf',
  ];
  for (const dashboardConfigSiteOrigin of dashboardConfigSiteOrigins) {
    const postmam = new Postmam(window, dashboardConfigSiteOrigin, dashboardConfigSiteOrigin);
    t.false(postmam.isSafeOrigin('http://site.com'));
  }
});

test('should allow any origin for legacy wildcard *', async t => {
  const postmam = new Postmam(window, '*', '*');
  t.true(postmam.isSafeOrigin('http://site.com'));
  t.true(postmam.isSafeOrigin('http://abcde.com'));
  t.true(postmam.isSafeOrigin('http://1234.com'));
});


