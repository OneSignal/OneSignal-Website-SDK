import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import StackTrace from 'stacktrace-js';
import log from 'loglevel';
import { guid, delay, isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, logError } from '../src/utils.js';
import {APP_ID, PLAYER_ID} from './vars.js';

chai.use(chaiAsPromised);

describe('sdk.js', function(done) {
  describe('Environment', () => {
    it('isPushNotificationsSupported() should return true', () => {
      expect(isPushNotificationsSupported()).to.be.true;
    });

    it('isPushNotificationsSupportedAndWarn() should return true', () => {
      expect(isPushNotificationsSupportedAndWarn()).to.be.true;
    });
  })

  describe('SDK Initialization', () => {
    describe('Subdomain', () => {
      it('valid subdomains should have the proper subdomain extracted', () => {
        let validSubdomains = [
          'subdomain',
          '  subdomain  ',
          'https://subdomain.onesignal.com',
          'https://subdomain.onesignal.com/',
          'http://www.subdomain.onesignal.com',
          'https://www.subdomain.onesignal.com/',
          'http://subdomain.onesignal.com',
          'http://subdomain.onesignal.com/',
          'subdomain.onesignal.com',
          ];
        let expectedNormalizedSubdomain = 'subdomain';
        for (let validSubdomain of validSubdomains) {
          let actualNormalizedSubdomain = OneSignal.helpers.getNormalizedSubdomain(validSubdomain);
          expect(actualNormalizedSubdomain).to.equal(expectedNormalizedSubdomain);
        }
      });
    });
  })
});