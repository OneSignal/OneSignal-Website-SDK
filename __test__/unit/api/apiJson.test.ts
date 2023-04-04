import { ReaderManager } from "../../support/managers/ReaderManager";
import OneSignal from "../../../src/onesignal/OneSignal";
import { OneSignalWithIndex } from "./OneSignalWithIndex";
import { isAsyncFunction } from "../../support/helpers/api";
import { IdentityExecutor } from "../../../src/core/executors/IdentityExecutor";
import { PropertiesExecutor } from "../../../src/core/executors/PropertiesExecutor";
import { SubscriptionExecutor } from "../../../src/core/executors/SubscriptionExecutor";

const matchNestedNamespaces = (api: any, parentObject: IndexableByString<any>, namespaceName: string) => {
  const nestedNamespaces = api[namespaceName]?.namespaces;

  if (!nestedNamespaces) return;

  // Check if all (nested) namespaces are present in the SDK
  for (const name of nestedNamespaces) {
    expect(parentObject[namespaceName][name]).toBeDefined();
  }
}

const matchNestedFunctions = (api: any, parentObject: IndexableByString<any>, namespaceName: string) => {
  const nestedFunctions = api[namespaceName]?.functions;

  if (!nestedFunctions) return;

  // Check if all functions are present in the SDK
  for (const func of nestedFunctions) {
    const { name, isAsync, args } = func;
    expect(typeof parentObject[namespaceName][name]).toBe('function');
    expect(parentObject[namespaceName][name].length).toBe(args.length);

    // for each argument, check the name and type
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      expect(parentObject[namespaceName][name].toString()).toContain(arg.name);
      // to do: check the type
    }

    if (isAsync) {
      expect(isAsyncFunction(parentObject[namespaceName][name])).toBe(true);
    }
  }
}

const matchApiToSpec = async (parent: object, namespace: string) => {
  const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
  const api = JSON.parse(rawJson);

  matchNestedNamespaces(api, parent, namespace);
  matchNestedFunctions(api, parent, namespace);
};

describe('API matches spec file', () => {
  let OneSignalWithIndex: OneSignalWithIndex;

  beforeAll(() => {
    OneSignalWithIndex = OneSignal as OneSignalWithIndex;
    test.stub(PropertiesExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
    test.stub(IdentityExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
    test.stub(SubscriptionExecutor.prototype, 'getOperationsFromCache', Promise.resolve([]));
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('Check top-level OneSignal API', async () => {
    try {
      await matchApiToSpec({ OneSignal: OneSignalWithIndex }, 'OneSignal');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check Slidedown namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'Slidedown');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check Notifications namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'Notifications');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check Session namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'Session');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check User namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex, 'User');
    } catch (e) {
      test.fail(e.message);
    }
  });

  test('Check PushSubscription namespace', async () => {
    try {
      await matchApiToSpec(OneSignalWithIndex['User'], 'PushSubscription');
    } catch (e) {
      test.fail(e.message);
    }
  });
});
