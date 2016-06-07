import Extension from './extension';

export default class OneSignalTests {
  static runHttpsSubscribedTests() {
    require('./httpsSubscribedTests.js');
  }

  static runUnsubscribedTests() {
    require('./unsubscribedTests.js');
  }
}

window.OneSignalTests = OneSignalTests;