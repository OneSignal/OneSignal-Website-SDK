import '../../support/polyfills/polyfills';
import test from 'ava';
import OneSignalError from "../../../src/errors/OneSignalError";
import {throws} from "../../support/tester/asyncFunctions";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import Environment from "../../../src/Environment";
import SubscriptionHelper from "../../../src/helpers/SubscriptionHelper";


test(`can simulate HTTPS site`, async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  t.false(SubscriptionHelper.isUsingSubscriptionWorkaround());
});

test(`can simulate HTTP site`, async t => {
  await TestEnvironment.initialize({
    initOptions: {
      subdomainName: 'testSubdomain'
    }
  });
  t.true(SubscriptionHelper.isUsingSubscriptionWorkaround());
});