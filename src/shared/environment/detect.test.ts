import { TestEnvironment } from "__test__/support/environment/TestEnvironment";
import { describe, expect, test, vi } from "vite-plus/test";
import { SubscriptionType } from "../subscriptions/constants";
import { getSubscriptionType, useSafariLegacyPush } from "./detect";

let getOneSignalApiUrl: typeof import("src/shared/environment/detect").getOneSignalApiUrl;

const resetModules = async () => {
  vi.resetModules();
  getOneSignalApiUrl = (await import("src/shared/environment/detect"))
    .getOneSignalApiUrl;
};

const FAKE_SAFARI_WEB_ID =
  "web.onesignal.auto.017d7a1b-f1ef-4fce-a00c-21a546b5491d";

const mockSafariPushNotification = (
  permission: "default" | "granted" | "denied",
  deviceToken: string | null,
) => {
  Object.defineProperty(window, "safari", {
    value: {
      pushNotification: {
        permission: () => ({ permission, deviceToken }),
      },
    },
    writable: true,
    configurable: true,
  });
};

const clearSafariWindow = () => {
  Object.defineProperty(window, "safari", {
    value: undefined,
    writable: true,
    configurable: true,
  });
};

const mockVapidSupport = () => {
  (globalThis as any).PushSubscriptionOptions = {
    prototype: { applicationServerKey: undefined },
  };
};

const clearVapidSupport = () => {
  delete (globalThis as any).PushSubscriptionOptions;
};

describe("Environment Helper", () => {
  test("can get api url ", async () => {
    // staging
    (global as any).__API_TYPE__ = "staging";
    (global as any).__API_ORIGIN__ = "onesignal-staging.com";
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe(
      "https://onesignal-staging.com/api/v1/",
    );

    // development -  turbine endpoint
    (global as any).__API_ORIGIN__ = "localhost";
    (global as any).__API_TYPE__ = "development";
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe(
      "http://localhost:3000/api/v1/",
    );
    expect(
      getOneSignalApiUrl({
        action: "outcomes",
      }).toString(),
    ).toBe("http://localhost:18080/api/v1/");

    // production
    (global as any).__API_TYPE__ = "production";
    await resetModules();
    expect(getOneSignalApiUrl().toString()).toBe("https://api.onesignal.com/");

    // production - legacy
    expect(
      getOneSignalApiUrl({
        legacy: true,
      }).toString(),
    ).toBe("https://onesignal.com/api/v1/");
  });
});

describe("useSafariLegacyPush", () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    clearSafariWindow();
    mockVapidSupport();
  });

  afterEach(() => {
    clearVapidSupport();
  });

  test("returns false when window.safari is undefined", () => {
    expect(useSafariLegacyPush()).toBe(false);
  });

  test("returns false when safari.pushNotification is undefined", () => {
    Object.defineProperty(window, "safari", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(useSafariLegacyPush()).toBe(false);
  });

  test("returns false when safariWebId is not configured", () => {
    mockSafariPushNotification("granted", "abc123");
    OneSignal.config!.safariWebId = undefined;
    expect(useSafariLegacyPush()).toBe(false);
  });

  test('returns false when legacy permission is "default" (new user on Safari 16.4+)', () => {
    mockSafariPushNotification("default", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(useSafariLegacyPush()).toBe(false);
  });

  test('returns false when legacy permission is "denied"', () => {
    mockSafariPushNotification("denied", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(useSafariLegacyPush()).toBe(false);
  });

  test('returns false when permission is "granted" but deviceToken is null', () => {
    mockSafariPushNotification("granted", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(useSafariLegacyPush()).toBe(false);
  });

  test("returns true when user has an active legacy subscription", () => {
    mockSafariPushNotification("granted", "aabbccdd11223344");
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(useSafariLegacyPush()).toBe(true);
  });

  test("returns true on Safari < 16.4 (no VAPID support) even for new users", () => {
    clearVapidSupport();
    mockSafariPushNotification("default", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(useSafariLegacyPush()).toBe(true);
  });
});

describe("getSubscriptionType", () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    clearSafariWindow();
    mockVapidSupport();
  });

  afterEach(() => {
    clearVapidSupport();
  });

  test("returns SafariLegacyPush for existing legacy Safari subscribers", () => {
    mockSafariPushNotification("granted", "aabbccdd11223344");
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(getSubscriptionType()).toBe(SubscriptionType._SafariLegacyPush);
  });

  test("returns SafariPush (VAPID) for new Safari users on Safari 16.4+", () => {
    mockSafariPushNotification("default", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(getSubscriptionType()).not.toBe(SubscriptionType._SafariLegacyPush);
  });

  test("does not return SafariLegacyPush when safari window exists but no legacy subscription", () => {
    mockSafariPushNotification("denied", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(getSubscriptionType()).not.toBe(SubscriptionType._SafariLegacyPush);
  });

  test("returns SafariLegacyPush on Safari < 16.4 (no VAPID support)", () => {
    clearVapidSupport();
    mockSafariPushNotification("default", null);
    OneSignal.config!.safariWebId = FAKE_SAFARI_WEB_ID;
    expect(getSubscriptionType()).toBe(SubscriptionType._SafariLegacyPush);
  });
});
