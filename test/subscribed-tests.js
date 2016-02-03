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
  });

  describe('Tags', () => {
    var sentTags, expectedTags, expectedTagsUnsent, tagsToCheckDeepEqual;

    before(() => {
      sentTags = {
        'null': null,
        'undefined': undefined,
        'true': true,
        'false': false,
        'string': 'This is a string.',
        'number': 123456789,
        'decimal': 123456789.987654321,
        'array.empty': [],
        'array.one': [1],
        'array.multi': [1, 2, 3],
        'array.nested': [0, [1], [[2]]],
        'object.empty': {},
        'object.one': JSON.stringify({key: 'value'}),
        'object.multi': JSON.stringify({a: 1, b: 2, c: 3}),
        'object.nested': JSON.stringify({a0: 1, b0: {a1: 1, b1: 1}, c0: {a1: 1, b1: {a2: 1, b2: {a3: 1}}}})
      };

      expectedTags = {
        "number": "123456789",
        "true": "true",
        "false": "false",
        "string": "This is a string.",
        "decimal": "123456789.98765433",
        "array.one": "[1]",
        "array.multi": "[1, 2, 3]",
        "array.nested": "[0, [1], [[2]]]",
        "object.one": '{"key":"value"}',
        "object.multi": '{"a":1,"b":2,"c":3}',
        "object.nested": '{"a0":1,"b0":{"a1":1,"b1":1},"c0":{"a1":1,"b1":{"a2":1,"b2":{"a3":1}}}}'
      };

      expectedTagsUnsent = ['null', 'undefined', 'array.empty', 'object.empty'];

      tagsToCheckDeepEqual = Object.keys(sentTags).filter(x => expectedTagsUnsent.concat(['string', 'false']).indexOf(x) < 0);
    });

    it('should successfully send, receive, and delete tags via promises', function () {
      expect(OneSignal.sendTags(sentTags)
        .then(() => OneSignal.getTags())
        .then(receivedTags => {
          expect(receivedTags).to.not.be.undefined;
          expectedTagsUnsent.forEach(tag => {
            expect(receivedTags.hasOwnProperty(tag)).to.be.false;
          });
          expect(receivedTags['string']).to.equal(sentTags['string']);
          expect(receivedTags['false']).to.equal(sentTags['false'].toString());
          tagsToCheckDeepEqual.forEach(key => {
            if (key.startsWith('object')) {
              expect(JSON.parse(receivedTags[key])).to.deep.equal(JSON.parse(sentTags[key]));
            } else {
              expect(JSON.parse(receivedTags[key])).to.deep.equal(sentTags[key]);
            }
          });
        })
        .then(() => OneSignal.deleteTags(Object.keys(expectedTags)))
        .then(() => OneSignal.getTags())
        .then(receivedTags => {
          Object.keys(expectedTags).forEach(tag => {
            expect(receivedTags.hasOwnProperty(tag)).to.be.false;
          });
        })
        .then(() => "successful")
        .catch(e => logError(e))).to.eventually.become('successful');
    });

    it('should successfully send, receive, and delete tags via callbacks', done => {
      expect(new Promise((resolve, reject) => {
        try {
          function getTagsCallback(receivedTags) {
            expect(receivedTags).to.not.be.undefined;
            expectedTagsUnsent.forEach(tag => {
              expect(receivedTags.hasOwnProperty(tag)).to.be.false;
            });
            expect(receivedTags['string']).to.equal(sentTags['string']);
            expect(receivedTags['false']).to.equal(sentTags['false'].toString());
            tagsToCheckDeepEqual.forEach(key => {
              if (key.startsWith('object')) {
                expect(JSON.parse(receivedTags[key])).to.deep.equal(JSON.parse(sentTags[key]));
              } else {
                expect(JSON.parse(receivedTags[key])).to.deep.equal(sentTags[key]);
              }
            });
            OneSignal.deleteTags(Object.keys(expectedTags), deleteTagsCallback);
          }

          function deleteTagsCallback(receivedTags) {
            expect(receivedTags).to.deep.equal(Object.keys(expectedTags));
            OneSignal.getTags(getTagsAfterDeletingCallback);
          }

          function getTagsAfterDeletingCallback(receivedTags) {
            Object.keys(expectedTags).forEach(tag => {
              expect(receivedTags.hasOwnProperty(tag)).to.be.false;
            });
            resolve("successful");
            done();
          }

          function onSendTagsComplete(tagsSent) {
            expect(tagsSent).to.deep.equal(sentTags);
            OneSignal.getTags(getTagsCallback);
          }

          OneSignal.sendTags(sentTags, onSendTagsComplete);
        }
        catch(e) {
          log.error(e);
        }
      })).to.eventually.become('successful');
    });

    it('should return a Promise', () => {
      let getTagsReturnValue = OneSignal.getTags();
      let sendTagReturnValue = OneSignal.sendTags();
      let sendTagsReturnValue = OneSignal.sendTags();
      let deleteTagReturnValue = OneSignal.deleteTag('');
      let deleteTagsReturnValue = OneSignal.deleteTags(['']);
      [getTagsReturnValue, sendTagReturnValue, sendTagsReturnValue, deleteTagReturnValue, deleteTagsReturnValue].forEach(x => expect(x.constructor.name).to.equal('Promise'));
    });
  })
});