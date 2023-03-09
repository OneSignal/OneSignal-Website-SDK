import { ReaderManager } from "../../support/managers/ReaderManager";
import OneSignal from "../../../src/onesignal/OneSignal";
import { OneSignalWithIndex } from "./OneSignalWithIndex";
import { isAsyncFunction } from "../../support/helpers/api";

describe('API matches spec file', () => {
  test('Check top-level OneSignal API', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all namespaces are present in the SDK
    for (const name of api.OneSignal.namespaces) {
      expect(OneSignalWithIndex[name]).toBeDefined();
    }

    // Check if all functions are present in the SDK
    for (const func of api.OneSignal.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex[name]).toBe('function');
      expect(OneSignalWithIndex[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex[name].toString()).toContain(arg.name);
        // to do: check the type
      }

      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex[name])).toBe(true);
      }
    }
  });

  test('Check Slidedown namespace', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all functions are present in the SDK
    for (const func of api.Slidedown.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex.Slidedown[name]).toBe('function');
      expect(OneSignalWithIndex.Slidedown[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex.Slidedown[name].toString()).toContain(arg.name);
        // to do: check the type
      }

      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex.Slidedown[name])).toBe(true);
      }
    }
  });

  test('Check Notification namespace', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all functions are present in the SDK
    for (const func of api.Notifications.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex.Notifications[name]).toBe('function');
      expect(OneSignalWithIndex.Notifications[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex.Notifications[name].toString()).toContain(arg.name);
        // to do: check the type
      }
      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex.Notifications[name])).toBe(true);
      }
    }
  });

  test('Check Session namespace', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all functions are present in the SDK
    for (const func of api.Session.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex.Session[name]).toBe('function');
      expect(OneSignalWithIndex.Session[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex.Session[name].toString()).toContain(arg.name);
        // to do: check the type
      }
      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex.Session[name])).toBe(true);
      }
    }
  });

  test('Check Debug namespace', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all functions are present in the SDK
    for (const func of api.Debug.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex.Debug[name]).toBe('function');
      expect(OneSignalWithIndex.Debug[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex.Debug[name].toString()).toContain(arg.name);
        // to do: check the type
      }
      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex.Debug[name])).toBe(true);
      }
    }
  });

  test('Check User namespace', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all namespaces are present in the SDK
    for (const name of api.User.namespaces) {
      expect(OneSignalWithIndex.User[name]).toBeDefined();
    }

    // Check if all functions are present in the SDK
    for (const func of api.User.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex.User[name]).toBe('function');
      expect(OneSignalWithIndex.User[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex.User[name].toString()).toContain(arg.name);
        // to do: check the type
      }
      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex.User[name])).toBe(true);
      }
    }
  });

  test('Check PushSubscription namespace', async () => {
    const rawJson = await ReaderManager.readFile(__dirname + '/../../../api.json');
    const api = JSON.parse(rawJson);

    const OneSignalWithIndex = OneSignal as OneSignalWithIndex;

    // Check if all functions are present in the SDK
    for (const func of api.PushSubscription.functions) {
      const { name, isAsync, args } = func;
      expect(typeof OneSignalWithIndex.User.PushSubscription[name]).toBe('function');
      expect(OneSignalWithIndex.User.PushSubscription[name].length).toBe(args.length);

      // for each argument, check the name and type
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        expect(OneSignalWithIndex.User.PushSubscription[name].toString()).toContain(arg.name);
        // to do: check the type
      }
      if (isAsync) {
        expect(isAsyncFunction(OneSignalWithIndex.User.PushSubscription[name])).toBe(true);
      }
    }
  });
});
