import SdkEnvironment from "../../../src/shared/managers/SdkEnvironment";
import PushSubscriptionNamespace from "../../../src/onesignal/PushSubscriptionNamespace";
import MainHelper from "../../../src/shared/helpers/MainHelper";
import Database from "../../../src/shared/services/Database";
import { DUMMY_PUSH_TOKEN, DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB, } from "../constants";
import { RequestService } from "../../../src/core/requestService/RequestService";

export function setupLoginStubs() {
  test.stub(PushSubscriptionNamespace.prototype, "_resubscribeToPushModelChanges", Promise.resolve());
  test.stub(RequestService, "getUser", Promise.resolve(DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB));
  test.stub(SdkEnvironment, "getWindowEnv");
  test.stub(MainHelper, "getCurrentPushToken", Promise.resolve(DUMMY_PUSH_TOKEN));
  test.stub(Database.prototype, "getSubscription", Promise.resolve({
    optedOut: false,
    subscriptionToken: DUMMY_PUSH_TOKEN
  }));
}
