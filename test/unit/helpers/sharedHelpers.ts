// This file can be used to put helper functions shared by various testing files

// normally called in the "afterEach" of tests to reset OneSignal initialization
export function resetOneSignalInit() {
  OneSignal._initCalled = false;
  OneSignal.__initAlreadyCalled = false;
  OneSignal._sessionInitAlreadyRunning = false;
}