import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import ConfirmationToast from '../../../src/page/slidedown/ConfirmationToast';
import { TOAST_IDS } from '../../../src/shared/slidedown/constants';
import { getDomElementOrStub } from '../../../src/shared/utils/utils';
import { BrowserUserAgent, TestEnvironment, HttpHttpsEnvironment } from '../../../test/support/sdk/TestEnvironment';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  (global as any).location = new URL("https://localhost:4001");
  const userConfig = TestEnvironment.getFakeMergedConfig({});
  const options = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    initOptions: userConfig,
    addPrompts: true
  };
  await TestEnvironment.stubDomEnvironment(options);
  await TestEnvironment.initialize(options);
});

test.afterEach(function () {
  sandbox.restore();
});

test("check that calling show() adds the confirmation toast to DOM", async t => {
  const toast = new ConfirmationToast("Thank You!");
  let containerFromDom = getDomElementOrStub(`#${TOAST_IDS.toastText}`);
  t.not(containerFromDom.id, TOAST_IDS.toastText);
  await toast.show();

  containerFromDom = getDomElementOrStub(`#${TOAST_IDS.toastText}`);
  t.is(containerFromDom.id, TOAST_IDS.toastText);
});
