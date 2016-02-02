import expect from 'chai';
import log from 'loglevel';
import { guid, delay, isPushNotificationsSupported, isPushNotificationsSupportedAndWarn } from '../src/utils.js';
import {APP_ID, PLAYER_ID} from './vars.js';

describe('sdk.js', function(done) {
  describe('Environment', () => {
    it('isPushNotificationsSupported() should return true', () => {
      isPushNotificationsSupported().should.be.true;
    });

    it('isPushNotificationsSupportedAndWarn() should return true', () => {
      isPushNotificationsSupportedAndWarn().should.be.true;
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

      tagsToCheckDeepEqual = Object.keys(sentTags).filter(x => expectedTagsUnsent.concat(['string']).indexOf(x) < 0);
    });

    it('should successfully send, receive, and delete tags via promises', function () {
      return OneSignal.sendTags(sentTags)
        .then(() => OneSignal.getTags())
        .then(receivedTags => {
          expectedTagsUnsent.forEach(tag => {
            (expectedTags.hasOwnProperty(tag)).should.be.false;
          });
          expectedTags['string'].should.equal(sentTags['string']);
          tagsToCheckDeepEqual.forEach(key => {
            if (key.startsWith('object')) {
              JSON.parse(expectedTags[key]).should.deep.equal(JSON.parse(sentTags[key]));
            } else {
              JSON.parse(expectedTags[key]).should.deep.equal(sentTags[key]);
            }
          });
        })
        .then(() => OneSignal.deleteTags(Object.keys(expectedTags)))
        .then(() => OneSignal.getTags())
        .then(receivedTags => {
          Object.keys(expectedTags).forEach(tag => {
            (receivedTags.hasOwnProperty(tag)).should.be.false;
          });
        })
        .then(() => "successful")
        .catch(e => {
          log.error(e);
          return Promise.reject();
        }).should.eventually.become('successful');
    });

    it('should successfully send, receive, and delete tags via callbacks', done => {
      return new Promise((resolve, reject) => {
        try {
          function getTagsCallback(receivedTags) {
            expectedTagsUnsent.forEach(tag => {
              (expectedTags.hasOwnProperty(tag)).should.be.false;
            });
            expectedTags['string'].should.equal(sentTags['string']);
            tagsToCheckDeepEqual.forEach(key => {
              if (key.startsWith('object')) {
                JSON.parse(expectedTags[key]).should.deep.equal(JSON.parse(sentTags[key]));
              } else {
                JSON.parse(expectedTags[key]).should.deep.equal(sentTags[key]);
              }
            });
            OneSignal.deleteTags(Object.keys(expectedTags), deleteTagsCallback);
          }

          function deleteTagsCallback(receivedTags) {
            receivedTags.should.deep.equal(Object.keys(expectedTags));
            OneSignal.getTags(getTagsAfterDeletingCallback);
          }

          function getTagsAfterDeletingCallback(receivedTags) {
            Object.keys(expectedTags).forEach(tag => {
              (receivedTags.hasOwnProperty(tag)).should.be.false;
            });
            resolve("successful");
            done();
          }

          function onSendTagsComplete(tagsSent) {
            tagsSent.should.deep.equal(sentTags);
            OneSignal.getTags(getTagsCallback);
          }

          OneSignal.sendTags(sentTags, onSendTagsComplete);
        }
        catch (e) {
          log.error(e);
          return Promise.reject();
        }
      }).should.eventually.become('successful');
    });

    it('should return a Promise', () => {
      let getTagsReturnValue = OneSignal.getTags();
      let sendTagReturnValue = OneSignal.sendTags();
      let sendTagsReturnValue = OneSignal.sendTags();
      let deleteTagReturnValue = OneSignal.deleteTag('');
      let deleteTagsReturnValue = OneSignal.deleteTags(['']);
      [getTagsReturnValue, sendTagReturnValue, sendTagsReturnValue, deleteTagReturnValue, deleteTagsReturnValue].forEach(x => x.constructor.name.should.equal('Promise'));
    });
  })
});