import "../../support/polyfills/polyfills";
import test, { ExecutionContext } from "ava";
import { HttpHttpsEnvironment, TestEnvironment } from '../../support/sdk/TestEnvironment';
import { OneSignalStubES5 } from "../../../src/page/utils/OneSignalStubES5";
import { OneSignalStubES6 } from "../../../src/page/utils/OneSignalStubES6";

import  '../../support/sdk/TestEnvironment';
import { ReplayCallsOnOneSignal } from "../../../src/page/utils/ReplayCallsOnOneSignal";
import { ProcessOneSignalPushCalls } from '../../../src/page/utils/ProcessOneSignalPushCalls';
import { OneSignalShimLoader } from "../../../src/page/utils/OneSignalShimLoader";
import { SinonSandbox } from "sinon";
import sinon from 'sinon';
import { setupBrowserWithPushAPIWithVAPIDEnv } from "../../support/tester/utils";
import Log from "../../../src/sw/libraries/Log";
import OneSignal, { OneSignalDeferredLoadedCallback } from "../../../src/onesignal/OneSignal";

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

class Defaults {
 public static delayedFunctionCall = { functionName: "", args: [], delayedPromise: undefined };
}

class OneSignalStubES5Test extends OneSignalStubES5 {
  public lastDirectFunctionCall: DelayedFunctionCall<any> = Defaults.delayedFunctionCall;
  public lastDirectPromiseFunctionCall: DelayedFunctionCall<any> = Defaults.delayedFunctionCall;

  protected stubFunction(thisObj: OneSignalStubES5Test, functionName: string, args: any[]): any {
    thisObj.lastDirectFunctionCall = { functionName: functionName, args: args, delayedPromise: undefined };
  }

  protected stubPromiseFunction(thisObj: OneSignalStubES5Test, functionName: string, args: any[]): Promise<any> {
    thisObj.lastDirectPromiseFunctionCall = { functionName: functionName, args: args, delayedPromise: undefined };
    return new Promise(() => {});
  }
}

function assertES5MethodIsCalled(t: ExecutionContext, oneSignalStub: OneSignalStubES5Test, functionName: string) {
  const retValue = (oneSignalStub as any)[functionName].call(null, `${functionName}:arg1`);
  t.is(oneSignalStub.lastDirectFunctionCall.functionName, functionName);
  t.is(oneSignalStub.lastDirectFunctionCall.args[0], `${functionName}:arg1`);
  t.is(oneSignalStub.lastDirectFunctionCall.args.length, 1);
  t.is(retValue,undefined);
}

function assertES5PromiseMethodIsCalled(t: ExecutionContext, oneSignalStub: OneSignalStubES5Test,
  functionName: string) {
    const retValue = (oneSignalStub as any)[functionName].call(null, `${functionName}:arg1`);
    t.is(oneSignalStub.lastDirectPromiseFunctionCall.functionName, functionName);
    t.is(oneSignalStub.lastDirectPromiseFunctionCall.args[0], `${functionName}:arg1`);
    t.is(oneSignalStub.lastDirectPromiseFunctionCall.args.length, 1);
    t.notDeepEqual(retValue, new Promise(() => {}));
}

test("correctly stubs all methods for ES5", async t => {
  // Make the environment unsupported by deleting Promise functionality
  await TestEnvironment.initialize();
  (window as any).Promise = undefined;

  const oneSignalStub = new OneSignalStubES5Test();

  t.false(oneSignalStub.isPushNotificationsSupported());
  t.false(await oneSignalStub.isPushNotificationsEnabled());

  // Test OneSignal.push
  let didCallPushFunction = false;
  oneSignalStub.push(() => { didCallPushFunction = true; });
  t.true(didCallPushFunction);

  assertES5MethodIsCalled(t, oneSignalStub, "on");
  assertES5MethodIsCalled(t, oneSignalStub, "off");
  assertES5MethodIsCalled(t, oneSignalStub, "once");

  assertES5PromiseMethodIsCalled(t, oneSignalStub, "init");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "_initHttp");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showHttpPrompt");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "registerForPushNotifications");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showHttpPermissionRequest");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showNativePrompt");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showSlidedownPrompt");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showCategorySlidedown");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showSmsSlidedown");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showEmailSlidedown");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "showSmsAndEmailSlidedown");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "syncHashedEmail");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getIdsAvailable");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getTags");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "sendTag");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "sendTags");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "deleteTag");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "deleteTags");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "addListenerForNotificationOpened");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getRegistrationId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getSubscription");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setEmail");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setSMSNumber");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "logoutEmail");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "logoutSMS");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setExternalUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "removeExternalUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getExternalUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "provideUserConsent");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getEmailId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getSMSId");
});


class OneSignalStubES6Test extends OneSignalStubES6 {

  public getLastStubCall(): DelayedFunctionCall<any> {
    return this.directFunctionCallsArray[this.directFunctionCallsArray.length - 1];
  }
}

function assertES6MethodIsCalled(t: ExecutionContext, oneSignalStub: OneSignalStubES6Test, functionName: string) {
  const retValue = (oneSignalStub as any)[functionName].call(null, `${functionName}:arg1`);

  t.is(oneSignalStub.getLastStubCall().functionName, functionName);
  t.is(oneSignalStub.getLastStubCall().args[0], `${functionName}:arg1`);
  t.is(oneSignalStub.getLastStubCall().args.length, 1);
  t.is(retValue,undefined);
}

function assertES6PromiseMethodIsCalled(t: ExecutionContext, oneSignalStub: OneSignalStubES6Test,
  functionName: string) {
    const retValue = (oneSignalStub as any)[functionName].call(null, `${functionName}:arg1`);
    t.is(oneSignalStub.getLastStubCall().functionName, functionName);
    t.is(oneSignalStub.getLastStubCall().args[0], `${functionName}:arg1`);
    t.is(oneSignalStub.getLastStubCall().args.length, 1);
    t.notDeepEqual(retValue, new Promise(() => {}));
}

test("correctly stubs all methods for ES6", async t => {
  const oneSignalStub = new OneSignalStubES6Test();

  t.true(oneSignalStub.isPushNotificationsSupported());

  // These methods should be stub out in a generic way, make sure they don't error out and call the correct stub

  assertES6MethodIsCalled(t, oneSignalStub, "on");
  assertES6MethodIsCalled(t, oneSignalStub, "off");
  assertES6MethodIsCalled(t, oneSignalStub, "once");
  assertES6MethodIsCalled(t, oneSignalStub, "push");

  // These methods should be stub out in a generic way, make sure they don't error out and return a promise.
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "init");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "_initHttp");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showHttpPrompt");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "registerForPushNotifications");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showHttpPermissionRequest");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showNativePrompt");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showSlidedownPrompt");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showCategorySlidedown");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showSmsSlidedown");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showEmailSlidedown");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "showSmsAndEmailSlidedown");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "syncHashedEmail");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getIdsAvailable");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getTags");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "sendTag");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "sendTags");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "deleteTag");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "deleteTags");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "addListenerForNotificationOpened");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getRegistrationId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getSubscription");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setEmail");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setSMSNumber");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "logoutEmail");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "logoutSMS");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setExternalUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "removeExternalUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getExternalUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "provideUserConsent");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getEmailId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getSMSId");
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

class MockOneSignalWithPromiseControl {
  public resolveValue: any;
  public rejectValue: any;

  async sendTag(_key: string, _value: any, _callback?: Action<Object>): Promise<Object> {
    return new Promise((resolve, reject) => {
      if (this.resolveValue)
        resolve(this.resolveValue);
      if (this.rejectValue) {
        reject(this.rejectValue);
      }
    });
  }
}

test("Expect Promise to never resolve for ES5 stubs", async t => {
  // Setup an OneSignalStubES5 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES5();
  const sendTagsPromise = (oneSignalStub as any).sendTag("key", "value");
  sendTagsPromise
    .then(() => t.fail() )
    .catch(() => t.fail());
  t.pass();
});

test("OneSignalSDK.js loads OneSignalStubES6 is loaded on a page on a browser supports push", async t => {
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);
  OneSignalShimLoader.start();
  t.true((<any>window).OneSignal instanceof OneSignalStubES6);
});

test("OneSignalSDK.js is loaded on a page on a browser that does NOT support push", async t => {
  // Setup spy for OneSignalShimLoader.addScriptToPage
  const addScriptToPageSpy = sandbox.spy(OneSignalShimLoader, <any>'addScriptToPage');

  OneSignalShimLoader.start();

  // Load ES5 stub on IE11. Built into shim, no need to load another js file.
  t.true((<any>window).OneSignal instanceof OneSignalStubES5);
  // Should NOT load any other .js files, such as the ES6 SDK
  t.is(addScriptToPageSpy.callCount, 0);
});

test("OneSignalSDK.js load from service worker context that supports push", async t => {
  sandbox.stub((<any>global), "window").value(undefined);
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);

  // Setup mock for self.importScripts
  (<any>global).self = { importScripts: () => {} };
  const importScriptsSpy = sandbox.spy((<any>global).self, 'importScripts');

  OneSignalShimLoader.start();

  // Ensure we load the worker build of the SDK with self.importScripts(<string>)
  t.true(importScriptsSpy.getCall(0).calledWithExactly("https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js?v=1"));
});


test("Existing OneSignal array before OneSignalSDK.js loaded ES6", async t => {
  const preExistingArray = [() => {}, ["init", "test"]];
  (<any>window).OneSignal = preExistingArray;

  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);
  OneSignalShimLoader.start();

  t.deepEqual(<object[]>(<OneSignalStubES6>(<any>window).OneSignal).preExistingArray, preExistingArray);
});

test("Existing OneSignal array before OneSignalSDK.js loaded ES5", async t => {
  const logErrorSpy = sandbox.spy(Log, "error");

  let didCallFunction = false;
  const preExistingArray = [() => {
    didCallFunction = true;
    (<any>window).OneSignal.init();
  }];
  (<any>window).OneSignal = preExistingArray;

  OneSignalShimLoader.start();

  t.true(didCallFunction);
  t.false(logErrorSpy.called);
});
