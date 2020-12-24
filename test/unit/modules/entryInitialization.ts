import "../../support/polyfills/polyfills";
import test, { ExecutionContext } from "ava";
import { HttpHttpsEnvironment, TestEnvironment } from '../../support/sdk/TestEnvironment';
import { OneSignalStubES5 } from "../../../src/utils/OneSignalStubES5";
import { OneSignalStubES6 } from "../../../src/utils/OneSignalStubES6";

import  '../../support/sdk/TestEnvironment';
import { ReplayCallsOnOneSignal } from "../../../src/utils/ReplayCallsOnOneSignal";
import { ProcessOneSignalPushCalls } from '../../../src/utils/ProcessOneSignalPushCalls';
import { OneSignalShimLoader } from "../../../src/utils/OneSignalShimLoader";
import { SinonSandbox } from "sinon";
import sinon from 'sinon';
import Log from "../../../src/libraries/Log";
import { setupBrowserWithPushAPIWithVAPIDEnv } from "../../support/tester/utils";

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
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getNotificationPermission");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setDefaultTitle");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setDefaultNotificationUrl");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "syncHashedEmail");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getTags");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "sendTag");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "sendTags");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "deleteTag");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "deleteTags");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "addListenerForNotificationOpened");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setSubscription");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getRegistrationId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getSubscription");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "sendSelfNotification");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setEmail");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "logoutEmail");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "setExternalUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "removeExternalUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getExternalUserId");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "provideUserConsent");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "isOptedOut");
  assertES5PromiseMethodIsCalled(t, oneSignalStub, "getEmailId");
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
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getNotificationPermission");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "isPushNotificationsEnabled");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setDefaultTitle");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setDefaultNotificationUrl");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "syncHashedEmail");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getTags");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "sendTag");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "sendTags");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "deleteTag");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "deleteTags");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "addListenerForNotificationOpened");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setSubscription");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getRegistrationId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getSubscription");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "sendSelfNotification");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setEmail");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "logoutEmail");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "setExternalUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "removeExternalUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getExternalUserId");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "provideUserConsent");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "isOptedOut");
  assertES6PromiseMethodIsCalled(t, oneSignalStub, "getEmailId");
});

// Creating an object like OneSignal, but with only the methods we need to mock
class MockOneSignal implements IOneSignal {
  public lastSendTags: IndexableByString<string> = {};

  push(item: Function | object[]): void {
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

test("Test ReplayCallsOnOneSignal replays ES6 calls with expected params", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES6();
  // Call OneSignal.sendTags(...) directly like a site developer would
  const sendTagsPromise = (oneSignalStub as any).sendTag("key", "value");

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignal();
  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  // Ensure our mock's sendTags got called correctly.
  t.deepEqual(mockOneSignal.lastSendTags, { key: "value" });

  // And the promise we resolved.
  await sendTagsPromise;
});


test("Test ReplayCallsOnOneSignal replays ES6 calls with expected params using push with function", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES6();
  // Call OneSignal.push(function(){}) like a site developer should be doing.
  const sendTagsPromise = (oneSignalStub as any).push(async function () {
    await (oneSignalStub as any).sendTag("key", "value");
  });

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignal();
  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  // Ensure our mock's sendTags got called correctly.
  t.deepEqual(mockOneSignal.lastSendTags, { key: "value" });

  // And the promise we resolved.
  await sendTagsPromise;
});

test("Test ReplayCallsOnOneSignal replays ES6 calls with expected params using push with params list", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES6();
  // Call OneSignal.push([]]) like a site developer should be doing.
  const sendTagsPromise = (oneSignalStub as any).push(["sendTag", "key1", "value2"]);

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignal();
  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  // Ensure our mock's sendTags got called correctly.
  t.deepEqual(mockOneSignal.lastSendTags, { key1: "value2" });

  // And the promise we resolved.
  await sendTagsPromise;
});

test("Test ReplayCallsOnOneSignal replays ES6 calls from preExistingArray with expected params with a function", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does, taking in any predefined window.OneSignal
  const oneSignalStub = new OneSignalStubES6([() => {
    (<any>global).OneSignal.sendTag("key", "value");
  }]);

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignal();
  (<any>global).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  // Ensure our mock's sendTags got called correctly.
  t.deepEqual(mockOneSignal.lastSendTags, { key: "value" });
});

test("Test ReplayCallsOnOneSignal replays ES6 calls from preExistingArray with expected params using push with params list", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES6([["sendTag", "key1", "value2"]]);

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignal();
  (<any>global).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  // Ensure our mock's sendTags got called correctly.
  t.deepEqual(mockOneSignal.lastSendTags, { key1: "value2" });
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

test("Test ReplayCallsOnOneSignal replays ES6 calls executing resolve promise", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES6();
  // Call OneSignal.sendTags(...) directly like a site developer may have done
  const sendTagsPromise = (oneSignalStub as any).sendTag("key", "value");

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignalWithPromiseControl();
  mockOneSignal.resolveValue = "resolveValue";
  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  sendTagsPromise.then((value: string) => {
      t.is(value, "resolveValue");
    });

  await sendTagsPromise;

  // Make sure 1 assert is made for the then
  t.plan(1);
});

test("Test ReplayCallsOnOneSignal replays ES6 calls executing reject promise", async t => {
  // Setup an OneSignalStubES6 instance like the OneSignalSDK.js Shim does.
  const oneSignalStub = new OneSignalStubES6();
  // Call OneSignal.sendTags(...) directly like a site developer may have done
  const sendTagsPromise = (oneSignalStub as any).sendTag("key", "value");

  // Set our fake mock to as window.OneSignal
  const mockOneSignal = new MockOneSignalWithPromiseControl();
  mockOneSignal.rejectValue = "rejectValue";
  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  sendTagsPromise.catch((value: string) => {
    t.is(value, "rejectValue");
  });

  try {
    await sendTagsPromise;
  } catch (e) {
    t.is(e, "rejectValue");
  }

  // Make sure 2 asserts are made, one for the local catch and the other on the await
  t.plan(2);
});

class MockOneSignalWithPublicProperties {
  public SERVICE_WORKER_UPDATER_PATH: string | undefined;
  public SERVICE_WORKER_PATH: string | undefined;
  public SERVICE_WORKER_PARAM: { scope: string } | undefined;

  public currentLogLevel: string | undefined;
  public log = {
    setLevel: (level: string): void => {
      this.currentLogLevel = level;
    }
  };
}

test("Make sure property field transfer over", async t => {
  const oneSignalStub = new OneSignalStubES6();
  oneSignalStub.SERVICE_WORKER_PATH = "SERVICE_WORKER_UPDATER_PATH";
  oneSignalStub.SERVICE_WORKER_UPDATER_PATH = "SERVICE_WORKER_UPDATER_PATH";
  oneSignalStub.SERVICE_WORKER_PARAM = { scope: "scope" };
  oneSignalStub.log.setLevel("trace");

  const mockOneSignal = new MockOneSignalWithPublicProperties();

  (global as any).OneSignal = mockOneSignal;

  // Replay function calls we called on the stub on our mock
  ReplayCallsOnOneSignal.doReplay(oneSignalStub);

  t.is(mockOneSignal.SERVICE_WORKER_PATH, "SERVICE_WORKER_UPDATER_PATH");
  t.is(mockOneSignal.SERVICE_WORKER_UPDATER_PATH, "SERVICE_WORKER_UPDATER_PATH");
  t.is(mockOneSignal.currentLogLevel, "trace");
  t.deepEqual(mockOneSignal.SERVICE_WORKER_PARAM, { scope: "scope" });
});

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
    (<any>window).OneSignal.setDefaultNotificationUrl("test");
  }];
  (<any>window).OneSignal = preExistingArray;

  OneSignalShimLoader.start();

  t.true(didCallFunction);
  t.false(logErrorSpy.called);
});
