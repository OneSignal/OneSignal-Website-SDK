import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import { isUsingSubscriptionWorkaround } from '../../../src/shared/utils/utils';


test(`can simulate HTTPS site`, async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  t.false(isUsingSubscriptionWorkaround());
});

test(`can simulate HTTP site`, async t => {
  await TestEnvironment.initialize({
    initOptions: {
      subdomain: 'testSubdomain'
    }
  });
  t.true(isUsingSubscriptionWorkaround());
});
