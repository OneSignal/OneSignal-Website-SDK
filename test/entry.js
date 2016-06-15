import Extension from './extension';
import Utils from './utils';

export default class OneSignalTests {
  static runTests() {
    require('./tests.js');
  }
}

window.OneSignalTests = OneSignalTests;
window.utils = Utils;