import '../../support/polyfills/polyfills';
import test from 'ava';

import '../../support/sdk/TestEnvironment';
import { ProcessOneSignalPushCalls } from '../../../src/page/utils/ProcessOneSignalPushCalls';
import { OneSignalShimLoader } from '../../../src/page/utils/OneSignalShimLoader';
import { SinonSandbox } from 'sinon';
import sinon from 'sinon';
import { setupBrowserWithPushAPIWithVAPIDEnv } from '../../support/tester/utils';
import { OneSignalDeferredLoadedCallback } from '../../../src/page/models/OneSignalDeferredLoadedCallback';

// TODO: We still need some tests like this, but they will be much different. Testing to ensure the
//       OneSignalDeferred functions work.

let sandbox: SinonSandbox;

test.beforeEach(async function () {
  sandbox = sinon.sandbox.create();
  await TestEnvironment.stubDomEnvironment();
});

test.afterEach(function () {
  sandbox.restore();
});

// Creating an object like OneSignal, but with only the methods we need to mock
class MockOneSignal implements IOneSignal {
  public lastSendTags: IndexableByString<string> = {};

  push(item: OneSignalDeferredLoadedCallback): void {
    ProcessOneSignalPushCalls.processItem(this, item);
  }

  // Mocking implementation of sendTags
  async sendTag(
    key: string,
    value: any,
    _callback?: Action<Object>,
  ): Promise<Object | void> {
    this.lastSendTags[key] = value;
    return new Promise<void>((resolve, _reject) => {
      resolve();
    });
  }
}

test('OneSignalSDK.page.js add OneSignalSDK.page.es6.js script tag on a browser supports push', async (t) => {
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);
  // Setup spy for OneSignalShimLoader.addScriptToPage
  const addScriptToPageSpy = sandbox.spy(
    OneSignalShimLoader,
    <any>'addScriptToPage',
  );

  OneSignalShimLoader.start();
  t.is(addScriptToPageSpy.callCount, 1);
});

test('OneSignalSDK.page.js is loaded on a page on a browser that does NOT support push', async (t) => {
  // Setup spy for OneSignalShimLoader.addScriptToPage
  const addScriptToPageSpy = sandbox.spy(
    OneSignalShimLoader,
    <any>'addScriptToPage',
  );

  OneSignalShimLoader.start();

  // Should NOT load any other .js files, such as the ES6 SDK
  t.is(addScriptToPageSpy.callCount, 0);
});

test('OneSignalSDK.page.js load from service worker context that supports push', async (t) => {
  sandbox.stub(<any>global, 'window').value(undefined);
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);

  // Setup mock for self.importScripts
  (<any>global).self = { importScripts: () => {} };
  const importScriptsSpy = sandbox.spy((<any>global).self, 'importScripts');

  OneSignalShimLoader.start();

  // Ensure we load the worker build of the SDK with self.importScripts(<string>)
  t.true(
    importScriptsSpy
      .getCall(0)
      .calledWithExactly(
        'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js?v=1',
      ),
  );
});
