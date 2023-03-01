import SdkEnvironment from "../../../src/shared/managers/SdkEnvironment";
import { CoreModuleDirector } from "../../../src/core/CoreModuleDirector";
import PushSubscriptionNamespace from "../../../src/onesignal/PushSubscriptionNamespace";
import LoginManager from "../../../src/page/managers/LoginManager";
import MainHelper from "../../../src/shared/helpers/MainHelper";
import Database from "../../../src/shared/services/Database";
import { DUMMY_PUSH_TOKEN } from "../constants";

export function setupLoginStubs() {
  test.stub(CoreModuleDirector.prototype, "resetModelRepoAndCache", Promise.resolve());
  test.stub(PushSubscriptionNamespace.prototype, "_resubscribeToPushModelChanges", Promise.resolve());
  test.stub(LoginManager, "fetchAndHydrate", Promise.resolve());
  test.stub(SdkEnvironment, "getWindowEnv");
  test.stub(MainHelper, "getCurrentPushToken", Promise.resolve(DUMMY_PUSH_TOKEN));
  test.stub(Database.prototype, "getSubscription", Promise.resolve({
    optedOut: false,
    subscriptionToken: DUMMY_PUSH_TOKEN
  }));
}
