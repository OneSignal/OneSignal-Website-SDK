import "../../support/polyfills/polyfills";
import test from "ava";
import { HttpHttpsEnvironment, TestEnvironment } from '../../support/sdk/TestEnvironment';

import  '../../support/sdk/TestEnvironment';
import { ReplayCallsOnOneSignal } from "../../../src/page/utils/ReplayCallsOnOneSignal";
import { ProcessOneSignalPushCalls } from '../../../src/page/utils/ProcessOneSignalPushCalls';
import { OneSignalShimLoader } from "../../../src/page/utils/OneSignalShimLoader";
import { SinonSandbox } from "sinon";
import sinon from 'sinon';
import { setupBrowserWithPushAPIWithVAPIDEnv } from "../../support/tester/utils";
import OneSignal from "../../../src/onesignal/OneSignal";
import { OneSignalDeferredLoadedCallback } from "../../../src/page/models/OneSignalDeferredLoadedCallback";

// TODO: We still need some tests like this, but they will be much different. Testing to ensure the
//       OneSignalDeferred functions work.

let sandbox: SinonSandbox;

test.beforeEach(async function() {
  sandbox = sinon.sandbox.create();
  await TestEnvironment.stubDomEnvironment({ httpOrHttps: HttpHttpsEnvironment.Https });
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
  async sendTag(key: string, value: any, _callback?: Action<Object>): Promise<Object|void> {
    this.lastSendTags[key] = value;
    return new Promise<void>((resolve, _reject) => {
      resolve();
    });
  }
}

test("Test ReplayCallsOnOneSignal fires functions ", async t => {
  // Setup OneSignalDeferred, as an array as a customer would
  const onesignalDeferred = [];
  // Call OneSignal.push(function(){}) like a site developer should be doing.

  let delayedPromise: DelayedPromise<any> | undefined = undefined;
  const promise = new Promise((resolve, reject) => {
    delayedPromise = { resolve, reject };
  });

  onesignalDeferred.push(async function(_onesignal: OneSignal) {
    delayedPromise!.resolve();
  });

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignal();
  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.processOneSignalDeferredArray(onesignalDeferred);

  // Ensure our function gets called.
  await promise;
});

test("OneSignalSDK.page.js add OneSignalSDK.page.es6.js script tag on a browser supports push", async t => {
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);
  // Setup spy for OneSignalShimLoader.addScriptToPage
  const addScriptToPageSpy = sandbox.spy(OneSignalShimLoader, <any>'addScriptToPage');

  OneSignalShimLoader.start();
  t.is(addScriptToPageSpy.callCount, 1);
});

test("OneSignalSDK.page.js is loaded on a page on a browser that does NOT support push", async t => {
  // Setup spy for OneSignalShimLoader.addScriptToPage
  const addScriptToPageSpy = sandbox.spy(OneSignalShimLoader, <any>'addScriptToPage');

  OneSignalShimLoader.start();

  // Should NOT load any other .js files, such as the ES6 SDK
  t.is(addScriptToPageSpy.callCount, 0);
});

test("OneSignalSDK.page.js load from service worker context that supports push", async t => {
  sandbox.stub((<any>global), "window").value(undefined);
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);

  // Setup mock for self.importScripts
  (<any>global).self = { importScripts: () => {} };
  const importScriptsSpy = sandbox.spy((<any>global).self, 'importScripts');

  OneSignalShimLoader.start();

  // Ensure we load the worker build of the SDK with self.importScripts(<string>)
  t.true(importScriptsSpy.getCall(0).calledWithExactly("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js?v=1"));
});
