import chai, { expect } from 'chai';
import StackTrace from 'stacktrace-js';
import log from 'loglevel';
import {APP_ID, PLAYER_ID} from './vars.js';
import SoloTest from './soloTest';
import PMPlus from './PMPlus';
import Utils from './utils';
import { executeAndTimeoutPromiseAfter, guid, isPushNotificationsSupported, isPushNotificationsSupportedAndWarn } from '../src/utils';
import IndexedDb from '../src/indexedDb';
import Environment from '../src/environment.js';
import Postmam from '../src/postmam.js';


chai.config.includeStack = false;
chai.config.showDiff = true;
chai.config.truncateThreshold = 0;

describe('HTTPS Tests', function() {

    describe('Notifications', function() {
        it('should subscribe and receive a welcome notification successfully', function () {
            return new SoloTest(this.test, {}, () => {
                return Utils.initialize({
                        welcomeNotification: true,
                        autoRegister: true
                    })
                    .then(() => Utils.expectEvent('notificationDisplay'))
                    .then(notification => {
                        expect(notification).to.not.be.null;
                        expect(notification).to.have.property('message', 'Thanks for subscribing!');
                        return Utils.wait(150);
                    })
                    .then(() => OneSignal.closeNotifications());
            });
        });

        it('should subscribe and receive a notification successfully', function () {
            return new SoloTest(this.test, {}, () => {
                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: true
                    })
                    .then(() => {
                        OneSignal.sendSelfNotification();
                        return Utils.expectEvent('notificationDisplay')
                    })
                    .then(notification => {
                        expect(notification).to.not.be.null;
                        expect(notification).to.have.property('message', 'This is an example notification.');
                        expect(notification).to.have.property('title', 'OneSignal Test Message');
                        return Utils.wait(150);
                    })
                    .then(() => OneSignal.closeNotifications());
            });
        });
    });

    describe('Tags', function () {
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

        it.only('should send, receive, and delete tags successfully', function () {
            return new SoloTest(this.test, {}, () => {
                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: true
                    })
                    .then(() => OneSignal.sendTags(sentTags))
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
                    });
            });
        });

        it('should successfully send, receive, and delete tags via callbacks', function () {
            return new SoloTest(this.test, {}, () => {
                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: true
                    })
                    .then(() => {
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
                    });
            });
        });

        it('should successfully send, receive, and delete tags via the singular sendTag and getTag method', function () {
            return new SoloTest(this.test, {}, () => {
                let tagKey = 'string';
                let tagValue = sentTags[tagKey];

                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: true
                    })
                    .then(() => OneSignal.sendTag(tagKey, tagValue))
                    .then(() => OneSignal.getTags())
                    .then(receivedTags => {
                        expect(receivedTags).to.not.be.undefined;
                        expect(receivedTags[tagKey]).to.equal(tagValue);
                    })
                    .then(() => OneSignal.deleteTag(tagKey))
                    .then(() => OneSignal.getTags())
                    .then(receivedTags => {
                        expect(receivedTags).to.not.be.undefined;
                        expect(receivedTags[tagKey]).to.be.undefined;
                    });
            });
        });

        it('should return Promise objects', function () {
            return new SoloTest(this.test, {}, () => {
                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: true
                    })
                    .then(() => {
                        let getTagsReturnValue = OneSignal.getTags();
                        let sendTagReturnValue = OneSignal.sendTags();
                        let sendTagsReturnValue = OneSignal.sendTags();
                        let deleteTagReturnValue = OneSignal.deleteTag('');
                        let deleteTagsReturnValue = OneSignal.deleteTags(['']);
                        [getTagsReturnValue,
                         sendTagReturnValue,
                         sendTagsReturnValue,
                         deleteTagReturnValue,
                         deleteTagsReturnValue].forEach(x => expect(x.constructor.name).to.equal('Promise'));
                    });
            });
        });

        it('should automatically be sent after subscribing if called before subscribing', function () {
            return new SoloTest(this.test, {}, () => {
                let tagValue = guid();

                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: false
                    })
                    .then(() => {
                        OneSignal.database.printIds();
                        return OneSignal.getTags();
                    })
                    .then(tags => {
                        expect(tags).to.be.null;
                        // Initialize OneSignal and subscribe
                        return executeAndTimeoutPromiseAfter(new Promise(resolve => {
                                OneSignal.sendTags({key: tagValue}).then(resolve);
                                OneSignal.registerForPushNotifications();
                            }).catch(e => console.error(e)), 5000,
                            'Expected tags to be sent after subscription but tags were not sent.');
                    })
                    .then(() => {
                        return OneSignal.getTags();
                    })
                    .then(tags => {
                        expect(tags).to.not.be.null;
                        expect(tags).to.have.property('key', tagValue);
                    });
            });
        });
    });

    describe('Server-Sided State Changes', function () {
        it('should remove client-sided data if user is deleted from OneSignal dashboard', function () {
            return new SoloTest(this.test, {}, () => {
                let tagValue = guid();

                return Utils.initialize({
                        welcomeNotification: false,
                        autoRegister: true
                    })
                    .then(() => OneSignal.getUserId())
                    .then(id => {
                        expect(id).to.not.be.null;
                        // Set the user ID to something else; this has the same effect as deleting an ID on the dashboard
                        let newId = guid();
                        return Promise.all([id,
                            newId,
                            OneSignal.database.put("Ids", {type: "userId", id: newId})]);
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
                        OneSignal.getTags()
                            .catch(e => {
                                expect(error).to.have.property('errors');
                                expect(error.errors).to.include('Could not find app_id for given player id.');
                            });
                    })
                    .then(() => {
                        // User data should be deleted if this happens
                    });
            });
        });
    });

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