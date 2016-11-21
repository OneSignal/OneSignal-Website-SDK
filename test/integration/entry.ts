import Extension from './extension';
import Utils from './utils';

export default class OneSignalTests {
  static runTests() {
    require('./tests.js');
  }
}

(<any>window).OneSignalTests = OneSignalTests;
(<any>window).utils = Utils;