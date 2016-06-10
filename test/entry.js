import Extension from './extension';

export default class OneSignalTests {
  static runTests() {
    require('./tests.js');
  }
}

window.OneSignalTests = OneSignalTests;