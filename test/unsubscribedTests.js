import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import StackTrace from 'stacktrace-js';
import log from 'loglevel';
import { guid, delay, isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, logError } from '../src/utils.js';
import Postmam from '../src/postmam.js';
import Environment from '../src/environment.js';
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

    describe('Postmam origin checking', () => {
      it('isSafeOrigin for HTTP sites', () => {
        let origin = 'http://site.com';
        let postmam = new Postmam(window, origin, origin, 'nonce');
        expect(postmam.isSafeOrigin('http://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('http://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com:123')).to.be.false;
        expect(postmam.isSafeOrigin('https://ww.site.com')).to.be.false;
      });
      it('isSafeOrigin for HTTP www. sites', () => {
        let origin = 'http://www.site.com';
        let postmam = new Postmam(window, origin, origin, 'nonce');
        expect(postmam.isSafeOrigin('http://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('http://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com:123')).to.be.false;
        expect(postmam.isSafeOrigin('https://ww.site.com')).to.be.false;
      });

      it('isSafeOrigin for HTTPS sites', () => {
        let origin = 'https://site.com';
        let postmam = new Postmam(window, origin, origin, 'nonce');
        expect(postmam.isSafeOrigin('http://site.com')).to.be.false;
        expect(postmam.isSafeOrigin('http://www.site.com')).to.be.false;
        expect(postmam.isSafeOrigin('https://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com:123')).to.be.false;
        expect(postmam.isSafeOrigin('https://ww.site.com')).to.be.false;
      });

      it('isSafeOrigin for * sites', () => {
        let origin = '*';
        let postmam = new Postmam(window, origin, origin, 'nonce');
        expect(postmam.isSafeOrigin('http://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('http://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('https://www.site.com:123')).to.be.true;
        expect(postmam.isSafeOrigin('https://ww.site.com')).to.be.true;
        expect(postmam.isSafeOrigin('abc')).to.be.true;
      });

      it('isSafeOrigin for invalid sites', () => {
        let origin = '*.google.com';
        let postmam = new Postmam(window, origin, origin, 'nonce');
        expect(postmam.isSafeOrigin('http://site.com')).to.be.false;
        expect(postmam.isSafeOrigin('http://www.site.com')).to.be.false;
        expect(postmam.isSafeOrigin('https://site.com')).to.be.false;
        expect(postmam.isSafeOrigin('https://www.site.com')).to.be.false;
        expect(postmam.isSafeOrigin('https://www.site.com:123')).to.be.false;
        expect(postmam.isSafeOrigin('https://ww.site.com')).to.be.false;
        expect(postmam.isSafeOrigin('abc')).to.be.false;
      });
    });

    describe('Navigator language checking', () => {
      it('is navigator language detected correctly', () => {
        expect(Environment.getLanguage('en-US')).to.equal('en');
        expect(Environment.getLanguage('english-US')).to.equal('en');
        expect(Environment.getLanguage('zh')).to.equal('zh-Hant');
        expect(Environment.getLanguage('zh-CN')).to.equal('zh-Hans');
        expect(Environment.getLanguage('zh-Hans')).to.equal('zh-Hans');
        expect(Environment.getLanguage('zh-TW')).to.equal('zh-Hant');
        expect(Environment.getLanguage('zh-Hant')).to.equal('zh-Hant');
        expect(Environment.getLanguage('de-Arabic')).to.equal('de');
      });
    });
  })
});