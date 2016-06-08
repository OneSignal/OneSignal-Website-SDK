import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import StackTrace from 'stacktrace-js';
import log from 'loglevel';
import {APP_ID, PLAYER_ID} from './vars.js';
import SoloTest from './soloTest';
import PMPlus from './PMPlus';
import Utils from './utils';
import { executeAndTimeoutPromiseAfter, guid } from '../src/utils';
import IndexedDb from '../src/indexedDb';

chai.use(chaiAsPromised);

describe('HTTPS Subscribed Tests', function() {
  // describe('Environment', () => {
  //   it('isPushNotificationsSupported() should return true', () => {
  //     expect(isPushNotificationsSupported()).to.be.true;
  //   });
  //
  //   it('isPushNotificationsSupportedAndWarn() should return true', () => {
  //     expect(isPushNotificationsSupportedAndWarn()).to.be.true;
  //   });
  // });
  //
  // describe('Tags', () => {
  //   var sentTags, expectedTags, expectedTagsUnsent, tagsToCheckDeepEqual;
  //
  //   before(() => {
  //     sentTags = {
  //       'null': null,
  //       'undefined': undefined,
  //       'true': true,
  //       'false': false,
  //       'string': 'This is a string.',
  //       'number': 123456789,
  //       'decimal': 123456789.987654321,
  //       'array.empty': [],
  //       'array.one': [1],
  //       'array.multi': [1, 2, 3],
  //       'array.nested': [0, [1], [[2]]],
  //       'object.empty': {},
  //       'object.one': JSON.stringify({key: 'value'}),
  //       'object.multi': JSON.stringify({a: 1, b: 2, c: 3}),
  //       'object.nested': JSON.stringify({a0: 1, b0: {a1: 1, b1: 1}, c0: {a1: 1, b1: {a2: 1, b2: {a3: 1}}}})
  //     };
  //
  //     expectedTags = {
  //       "number": "123456789",
  //       "true": "true",
  //       "false": "false",
  //       "string": "This is a string.",
  //       "decimal": "123456789.98765433",
  //       "array.one": "[1]",
  //       "array.multi": "[1, 2, 3]",
  //       "array.nested": "[0, [1], [[2]]]",
  //       "object.one": '{"key":"value"}',
  //       "object.multi": '{"a":1,"b":2,"c":3}',
  //       "object.nested": '{"a0":1,"b0":{"a1":1,"b1":1},"c0":{"a1":1,"b1":{"a2":1,"b2":{"a3":1}}}}'
  //     };
  //
  //     expectedTagsUnsent = ['null', 'undefined', 'array.empty', 'object.empty'];
  //
  //     tagsToCheckDeepEqual = Object.keys(sentTags).filter(x => expectedTagsUnsent.concat(['string', 'false']).indexOf(x) < 0);
  //   });
  //
  //   it('should successfully send, receive, and delete tags via promises', function () {
  //     expect(OneSignal.sendTags(sentTags)
  //       .then(() => OneSignal.getTags())
  //       .then(receivedTags => {
  //         expect(receivedTags).to.not.be.undefined;
  //         expectedTagsUnsent.forEach(tag => {
  //           expect(receivedTags.hasOwnProperty(tag)).to.be.false;
  //         });
  //         expect(receivedTags['string']).to.equal(sentTags['string']);
  //         expect(receivedTags['false']).to.equal(sentTags['false'].toString());
  //         tagsToCheckDeepEqual.forEach(key => {
  //           if (key.startsWith('object')) {
  //             expect(JSON.parse(receivedTags[key])).to.deep.equal(JSON.parse(sentTags[key]));
  //           } else {
  //             expect(JSON.parse(receivedTags[key])).to.deep.equal(sentTags[key]);
  //           }
  //         });
  //       })
  //       .then(() => OneSignal.deleteTags(Object.keys(expectedTags)))
  //       .then(() => OneSignal.getTags())
  //       .then(receivedTags => {
  //         Object.keys(expectedTags).forEach(tag => {
  //           expect(receivedTags.hasOwnProperty(tag)).to.be.false;
  //         });
  //       })
  //       .then(() => "successful")
  //       .catch(e => logError(e))).to.eventually.become('successful');
  //   });
  //
  //   it('should successfully send, receive, and delete tags via callbacks', done => {
  //     expect(new Promise((resolve, reject) => {
  //       try {
  //         function getTagsCallback(receivedTags) {
  //           expect(receivedTags).to.not.be.undefined;
  //           expectedTagsUnsent.forEach(tag => {
  //             expect(receivedTags.hasOwnProperty(tag)).to.be.false;
  //           });
  //           expect(receivedTags['string']).to.equal(sentTags['string']);
  //           expect(receivedTags['false']).to.equal(sentTags['false'].toString());
  //           tagsToCheckDeepEqual.forEach(key => {
  //             if (key.startsWith('object')) {
  //               expect(JSON.parse(receivedTags[key])).to.deep.equal(JSON.parse(sentTags[key]));
  //             } else {
  //               expect(JSON.parse(receivedTags[key])).to.deep.equal(sentTags[key]);
  //             }
  //           });
  //           OneSignal.deleteTags(Object.keys(expectedTags), deleteTagsCallback);
  //         }
  //
  //         function deleteTagsCallback(receivedTags) {
  //           expect(receivedTags).to.deep.equal(Object.keys(expectedTags));
  //           OneSignal.getTags(getTagsAfterDeletingCallback);
  //         }
  //
  //         function getTagsAfterDeletingCallback(receivedTags) {
  //           Object.keys(expectedTags).forEach(tag => {
  //             expect(receivedTags.hasOwnProperty(tag)).to.be.false;
  //           });
  //           resolve("successful");
  //           done();
  //         }
  //
  //         function onSendTagsComplete(tagsSent) {
  //           expect(tagsSent).to.deep.equal(sentTags);
  //           OneSignal.getTags(getTagsCallback);
  //         }
  //
  //         OneSignal.sendTags(sentTags, onSendTagsComplete);
  //       }
  //       catch(e) {
  //         log.error(e);
  //       }
  //     })).to.eventually.become('successful');
  //   });
  //
  //   it('should successfully send, receive, and delete tags via the singular sendTag() and getTag() method', () => {
  //     let tagKey = 'string';
  //     let tagValue = sentTags[tagKey];
  //     expect(OneSignal.sendTag(tagKey, tagValue)
  //       .then(() => OneSignal.getTags())
  //       .then(receivedTags => {
  //         expect(receivedTags).to.not.be.undefined;
  //         expect(receivedTags[tagKey]).to.equal(tagValue);
  //       })
  //       .then(() => OneSignal.deleteTag(tagKey))
  //       .then(() => OneSignal.getTags())
  //       .then(receivedTags => {
  //         expect(receivedTags).to.not.be.undefined;
  //         expect(receivedTags[tagKey]).to.be.undefined;
  //       })
  //       .then(() => "successful")
  //       .catch(e => logError(e))).to.eventually.become('successful');
  //   });
  //
  //   it('should return a Promise', () => {
  //     let getTagsReturnValue = OneSignal.getTags();
  //     let sendTagReturnValue = OneSignal.sendTags();
  //     let sendTagsReturnValue = OneSignal.sendTags();
  //     let deleteTagReturnValue = OneSignal.deleteTag('');
  //     let deleteTagsReturnValue = OneSignal.deleteTags(['']);
  //     [getTagsReturnValue, sendTagReturnValue, sendTagsReturnValue, deleteTagReturnValue, deleteTagsReturnValue].forEach(x => expect(x.constructor.name).to.equal('Promise'));
  //   });
  // });

  describe('Tags', function() {
     it('Calling sendTags before subscribing should automatically send tags after subscribing', function() {
         let tagValue = guid();
         return new SoloTest(this.test, {}, () => {
             return Promise.all([
                     // Wipe database and force allow notifications permission
                     Extension.setNotificationPermission(`${location.origin}/*`, 'allow'),
                     Utils.wipeIndexedDb(),
                     Utils.wipeServiceWorkerAndUnsubscribe()
                 ])
                 .then(() => {
                     // Initialize OneSignal
                     return new Promise(resolve => {
                         window.OneSignal = OneSignal || [];
                         OneSignal.push(function () {
                             OneSignal.LOGGING = true;
                             OneSignal.push(["init", {
                                 appId: APP_ID,
                                 autoRegister: false,
                                 welcomeNotification: {
                                     disable: true
                                 }
                             }]);
                             OneSignal.on('initialize', resolve);
                         });
                     })
                     .then(() => OneSignal.getTags());
                 })
                 .then(tags => {
                     expect(tags).to.be.null;
                     // Initialize OneSignal and subscribe
                     return executeAndTimeoutPromiseAfter(new Promise(resolve => {
                         OneSignal.push(function () {
                             OneSignal.sendTags({key: tagValue}).then(resolve);
                         });
                         OneSignal.registerForPushNotifications();
                     }).catch(e => console.error(e)), 5000,
                         'Expected tags to be sent after subscription but tags were not sent.');
                 })
                 .then(() => {
                     return OneSignal.getTags();
                 })
                 .then(tags => {
                     // Ids should be diff
                     expect(tags).to.not.be.null;
                     expect(tags).to.have.property('key', tagValue);
                 })
         });

     });
  });

  describe('Server-Sided State Changes', function () {

    it('Remove client-sided data if user is deleted from OneSignal dashboard', function() {
      return new SoloTest(this.test, {}, () => {
        return Promise.all([
              // Wipe database and force allow notifications permission
              Extension.setNotificationPermission(`${location.origin}/*`, 'allow'),
              Utils.wipeIndexedDb(),
              Utils.wipeServiceWorkerAndUnsubscribe()
            ])
            .then(() => {
              // Initialize OneSignal and subscribe
              return executeAndTimeoutPromiseAfter(new Promise(resolve => {
                window.OneSignal = OneSignal || [];
                OneSignal.push(function () {
                  OneSignal.LOGGING = true;
                  OneSignal.push(["init", {
                    appId: APP_ID,
                    autoRegister: true,
                    welcomeNotification: {
                      disable: true
                    }
                  }]);

                  OneSignal.database.printIds();
                  OneSignal.on('subscriptionChange', resolve);
                });
              }).catch(e => console.error(e)), 3000, 'No subscription change after given time.');
            })
            .then(() => {
              // We're now subscribed
              return OneSignal.getUserId();
            })
            .then(id => {
              console.log('User ID (initial subscription):', id);
              expect(id).to.not.be.null;
              // Set the user ID to something else; this has the same effect as deleting an ID on the dashboard
              let newId = guid();
              return Promise.all([id,
                newId,
                IndexedDb.put("Ids", {type: "userId", id: newId})]);
            })
            .then(([originalId, newId]) => {
              // Ids should be diff
              expect(originalId).to.not.eq(newId);
              return Promise.all([newId, OneSignal.getUserId()]);
            })
            .then(([expectedNewId, actualNewId]) => {
              console.log('User ID (force modified to simulate delete):', actualNewId);
              expect(expectedNewId).to.eq(actualNewId);
              // Now call any one of the APIs that requires our user ID
              // We should get an error: User with this ID not found
              return expect(OneSignal.getTags())
                  .to.be.rejected
                  .then(error => {
                    expect(error).to.have.property('errors');
                    expect(error.errors).to.include('Could not find app_id for given player id.');
                  });
            })
            .then(() => {
              // User data should be deleted if this happens
            });
      });
    });

    it('a second test', function () {
      // if (!Test.isSoloInstance()) {
      //   console.log('Not running test because not in isolated session.', this);
      //   Test.createSoloInstance(this.test.title);
      // } else {
      //   console.log('Test contents here');
      //   window.close();
      // }
    });
  });
});