import Extension from './extension';

export default class OneSignalTests {
  static runHttpsTests() {
    require('./httpsTests.js');
  }

  static runUnsubscribedTests() {
    require('./unsubscribedTests.js');
  }
}

window.OneSignalTests = OneSignalTests;