import SdkEnvironment from '../../../src/shared/managers/SdkEnvironment';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import Database from '../../../src/shared/services/Database';
import {
  DUMMY_PUSH_TOKEN,
  DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB,
} from '../constants';
import { RequestService } from '../../../src/core/requestService/RequestService';
import { WindowEnvironmentKind } from '../../../src/shared/models/WindowEnvironmentKind';

export function setupLoginStubs() {
  vi.spyOn(RequestService, 'getUser').mockResolvedValue(
    DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB,
  );
  vi.spyOn(SdkEnvironment, 'getWindowEnv').mockReturnValue(
    WindowEnvironmentKind.Host,
  );
 
  // Doesn't work.
  // vi.spyOn(MainHelper, 'getCurrentPushToken').mockResolvedValue(
  //    new Promise(process.nextTick).then(() => DUMMY_PUSH_TOKEN)
  // );

  // vi.spyOn(MainHelper, 'getCurrentPushToken').mockReturnValue(
  //    new Promise(process.nextTick).then(() => DUMMY_PUSH_TOKEN)
  // );


  vi.spyOn(MainHelper, 'getCurrentPushToken').mockImplementation(async () => {
    console.log("mock getCurrentPushToken 1");
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    console.log("mock getCurrentPushToken 2");
    return DUMMY_PUSH_TOKEN;
    // DUMMY_PUSH_TOKEN // This works for the test, but thisn't even valid, since we are not returning a value.
  }) // Works, got called 2 times

 
  // vi.spyOn(MainHelper, 'getCurrentPushToken').mockImplementation(async () => {
  //   console.log("mock getCurrentPushToken 1");
  //   await new Promise((r) => process.nextTick(r));
  //   await new Promise((r) => process.nextTick(r));
  //   console.log("mock getCurrentPushToken 2");
  //   return DUMMY_PUSH_TOKEN;
  //   // DUMMY_PUSH_TOKEN // This works for the test, but thisn't even valid, since we are not returning a value.
  // }) // Works, got called 2 times intests
  
  // vi.spyOn(MainHelper, 'getCurrentPushToken').mockImplementation(async () => {
  //   await new Promise(process.nextTick);
  //   return DUMMY_PUSH_TOKEN;
  // }) // Doesn't wait, or not enough waiting?


  // vi.spyOn(MainHelper, 'getCurrentPushToken').mockImplementation(async () => new Promise(process.nextTick).then(() => DUMMY_PUSH_TOKEN));

  // vi.spyOn(MainHelper, 'getCurrentPushToken').mockResolvedValue(DUMMY_PUSH_TOKEN); // orignal

  vi.spyOn(Database.prototype, 'getSubscription').mockResolvedValue({
    optedOut: false,
    subscriptionToken: DUMMY_PUSH_TOKEN,
  });
}


// vi.spyOn(MainHelper, 'getCurrentPushToken').mockImplementation(
//   () => new Promise(process.nextTick).then(() => DUMMY_PUSH_TOKEN)
// );

// vi.spyOn(Database.prototype, 'getSubscription').mockResolvedValue({
// optedOut: false,
// subscriptionToken: DUMMY_PUSH_TOKEN,
// });

// // vi.spyOn(MainHelper, 'getCurrentPushToken').mockImplementation(
// //   new Promise(process.nextTick).then(() => DUMMY_PUSH_TOKEN)
// // );
// // vi.spyOn(Database.prototype, 'getSubscription').mockImplementation(
// //   new Promise(process.nextTick).then(() => (
// //     { optedOut: false, subscriptionToken: DUMMY_PUSH_TOKEN }
// //   ))
// )