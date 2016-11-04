import chai, { expect } from 'chai';
import StackTrace from 'stacktrace-js';
import log from 'loglevel';
import { USER_AUTH_KEY} from './vars.js';
import SoloTest from './soloTest';
import PMPlus from './PMPlus';
import Utils from './utils';
import {
    executeAndTimeoutPromiseAfter,
    guid,
    isPushNotificationsSupported,
    isPushNotificationsSupportedAndWarn
} from '../src/utils';
import IndexedDb from '../src/indexedDb';
import Environment from '../src/environment.js';
import Postmam from '../src/postmam.js';
import { DEV_FRAME_HOST } from '../src/vars.js';
import Database from '../src/database';
import MultiStepSoloTest from './multiStepSoloTest';
import isUuid from 'validator/lib/isUuid';


chai.config.includeStack = false;
chai.config.showDiff = true;
chai.config.truncateThreshold = 0;
chai.config.truncateThreshold = 0;
var globals = {};
window.globals = globals;

describe('Web SDK Tests', function () {

    before(async function () {
        console.log('OneSignal Tests: Starting web SDK tests.');
        let apps = await OneSignal.api.get(`apps`, null, {
            'Authorization': `Basic ${USER_AUTH_KEY}`
        });
        let appName = (location.protocol === 'https:' ? 'California' : 'Washington');
        console.log('Using app name:', appName);
        for (let app of apps) {
            if (app.name === appName) {
                globals.app = app;
            }
        }
        console.log('Finished before() function.');
    });

    describe('Notifications', function () {
        it('should subscribe and receive a welcome notification successfully', function () {
            return new SoloTest(this.test, {}, async() => {
                await Utils.initialize(globals, {                                            
                                           welcomeNotification: true,
                                           autoRegister: true
                                       });
                let notification = await Utils.expectEvent('notificationDisplay');
                expect(notification).to.not.be.null;
                expect(notification).to.have.property('content', 'Thanks for subscribing!');
                await Utils.wait(150);
                await OneSignal.closeNotifications();
            });
        });

        it('should subscribe and receive a notification successfully', function () {
            return new SoloTest(this.test, {}, async () => {
                await Utils.initialize(globals, {
                                           welcomeNotification: false,
                                           autoRegister: true
                                       });
                OneSignal.sendSelfNotification();
                let notification = await Utils.expectEvent('notificationDisplay');
                expect(notification).to.not.be.null;
                expect(notification).to.have.property('content', 'This is an example notification.');
                expect(notification).to.have.property('heading', 'OneSignal Test Message');
                await Utils.wait(150);
                await OneSignal.closeNotifications();
            });
        });
    });

    describe('Session Tracking', function() {
        let testHelper = function (test, kind, options) {
            return new MultiStepSoloTest(test, options, async (step, gotoStep) => {
                console.log('A');
                let initOptions = {
                    welcomeNotification: false,
                    autoRegister: kind.autoRegister,
                    useRegisterEvent: kind.autoRegister
                };
                if (step !== 'first') {
                    initOptions['dontWipeData'] = true;
                }
                if (step === 'first') {
                    await Utils.initialize(globals, {
                        welcomeNotification: false,
                        autoRegister: true,
                        useRegisterEvent: true
                    });
                    let id = await OneSignal.getUserId();
                    let player = await OneSignal.api.get(`players/${id}`);
                    await Extension.set('user-id', id);
                    console.log('Step 1');
                    console.log('Player:', player);
                    expect(player).to.have.property('session_count', 1);
                    await Extension.set('last-active', player.last_active);
                    await Utils.wait(1000);
                    if (!options.testFirstPageReload) {
                        sessionStorage.clear();
                    }
                    return gotoStep('2');
                } else if (step === '2') {
                    await Utils.initialize(globals, initOptions);
                    if (!kind.autoRegister && !options.testFirstPageReload) {
                        await Utils.expectEvent('register');
                    }
                    let id = await OneSignal.getUserId();
                    let retrievedId = await Extension.get('user-id');
                    expect(retrievedId).to.be.equal(id);
                    let player = await OneSignal.api.get(`players/${id}`);
                    console.log('Step 2');
                    console.log('Player:', player);
                    if (options.testFirstPageReload) {
                        expect(player).to.have.property('session_count', 1);
                    } else {
                        expect(player).to.have.property('session_count', 2);
                        let previousLastActive = await Extension.get('last-active');
                        expect(player.last_active).to.be.above(previousLastActive);

                        await Extension.set('last-active', player.last_active);
                        await Utils.wait(1000);
                        sessionStorage.clear();
                        return gotoStep('3');
                    }
                } else if (step === '3') {
                    await Utils.initialize(globals, initOptions);
                    if (!kind.autoRegister) {
                        await Utils.expectEvent('register');
                    }
                    let id = await OneSignal.getUserId();
                    let player = await OneSignal.api.get(`players/${id}`);
                    console.log('Step 3');
                    console.log('Player:', player);
                    expect(player).to.have.property('session_count', 3);
                    let previousLastActive = await Extension.get('last-active');
                    expect(player.last_active).to.be.above(previousLastActive);
                }
            });
        };

        it("should increment user's session_count on new site session for autoRegister true", async function () {
            return testHelper(this.test, {autoRegister: true}, {});
        });

        it("should increment user's session_count on new site session for autoRegister false", async function () {
            return testHelper(this.test, {autoRegister: false}, {});
        });

        it("should not increment user's session_count after first page reload", async function () {
            return testHelper(this.test, {autoRegister: false}, {testFirstPageReload: true});
        });
    });

    describe('HTTPS Modal Popup', function() {
       it('should be able to subscribe via HTTPS modal popup successfully', function() {
           return new SoloTest(this.test, {}, () => {
               if (location.protocol === 'https:') {
                   return Utils.initialize(globals, {
                           welcomeNotification: false,
                           autoRegister: false
                       })
                       .then(() => {
                           return new Promise(resolve => {
                               OneSignal.registerForPushNotifications({modalPrompt: true});
                               Utils.expectEvent('modalLoaded').then(resolve);
                           });
                       })
                       .then(() => {
                           Extension.acceptHttpsSubscriptionModal();
                           return Utils.expectEvent('subscriptionChange');
                       });
               }
           });           
       });
    });

    /**
     * This test simulates the X close button on the prompt.
     */
    describe('HTTPS Native Permission Popup', function() {
        it('should only show once per browser session', function() {
            if (location.protocol === 'https:') {
                return new MultiStepSoloTest(this.test, {}, async(step, gotoStep) => {
                    if (step === 'first') {
                        OneSignal.helpers.unmarkHttpsNativePromptDismissed();
                        await Extension.setNotificationPermission(`${location.origin}/*`, 'ask');
                        OneSignal.init({
                                           appId: globals.app.id,
                                           autoRegister: true
                                       });
                        try {
                            await Utils.expectEvent('permissionPromptDisplay', 5000);
                            // Simulate the X close popup
                            OneSignal.helpers.markHttpsNativePromptDismissed();
                            return gotoStep('2');
                        } catch (e) {
                            console.error(e);
                            throw e;
                        }
                    } else if (step === '2') {
                        await Extension.setNotificationPermission(`${location.origin}/*`, 'ask');
                        OneSignal.init({
                                           appId: globals.app.id,
                                           autoRegister: true
                                       });

                        try {
                            // We actually do NOT want this event (if we get it the test fails)
                            await Utils.expectEvent('permissionPromptDisplay', 2000);
                            throw "test-failed-prompt-displayed";
                        } catch (e) {
                            if (e === "test-failed-prompt-displayed") {
                                throw new Error("The test failed because the permission prompt was displayed" +
                                                " twice in the same session.");
                            } else {
                                console.error(e);
                            }
                            await Extension.setNotificationPermission(`${location.origin}/*`, 'allow');
                        }
                    }
                });
            }
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

        it('should send, receive, and delete tags successfully', function () {
            return new SoloTest(this.test, {}, () => {
                return Utils.initialize(globals, {
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
                return Utils.initialize(globals, {
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

                return Utils.initialize(globals, {
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
                return Utils.initialize(globals, {
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

                return Utils.initialize(globals, {
                        welcomeNotification: false,
                        autoRegister: false
                    })
                    .then(() => {
                        return OneSignal.getTags();
                    })
                    .then(tags => {
                        expect(tags).to.be.null;
                        // Initialize OneSignal and subscribe
                        return executeAndTimeoutPromiseAfter(new Promise(resolve => {
                                OneSignal.sendTags({key: tagValue}).then(resolve);
                                OneSignal.registerForPushNotifications();
                                if (location.protocol === 'http:') {
                                    Utils.expectEvent('popupLoad')
                                        .then(() => Extension.acceptHttpSubscriptionPopup())
                                }
                            }).catch(e => console.error(e)), 7000,
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
        it('should register a new user ID if user is deleted from OneSignal dashboard and opens a new site' +
              ' session', function () {
            return new MultiStepSoloTest(this.test, {}, (step, gotoStep) => {
                let tagValue = guid();

                if (step === 'first') {
                    return Utils.initialize(globals, {
                            welcomeNotification: false,
                            autoRegister: true
                        })
                        .then(() => OneSignal.getUserId())
                        .then(id => {
                            expect(id).to.not.be.null;
                            return Promise.all([
                                id,
                                Extension.set('user-id', id),
                                Utils.deletePlayer(id)]);
                        })
                        .then(([id]) => OneSignal.api.get(`players/${id}`)
                            .catch(error => {
                                expect(error).to.have.property('errors');
                                expect(error.errors).to.include('Could not find app_id for given player id.')
                            })
                        )
                        .then(() => {
                            return new Promise(() => {
                                sessionStorage.clear();
                                gotoStep('next');
                            });
                        });
                } else if (step === 'next') {
                    return Utils.initialize(globals, {
                            welcomeNotification: false,
                            autoRegister: true,
                            dontWipeData: true
                        })
                        .then(() => {
                            if (location.protocol === 'https:') {
                                return Utils.expectEvent('subscriptionChange')
                            }
                        })
                        .then(id => Promise.all([
                                Extension.get('user-id'),
                                OneSignal.getUserId()
                            ])
                        )
                        .then(([originalStoredId, currentId]) => {
                            console.log('Original ID:', originalStoredId);
                            console.log('New ID:', currentId);
                            expect(originalStoredId).to.not.be.null;
                            expect(currentId).to.not.be.null;
                            expect(originalStoredId).to.not.equal(currentId);
                        });
                }
            });
        });

        let testHelper = function (test, kind) {
            return new MultiStepSoloTest(test, {}, (step, gotoStep) => {
                let tagValue = guid();

                if (step === 'first') {
                    return Utils.initialize(globals, {
                            welcomeNotification: false,
                            autoRegister: true
                        })
                        .then(() => OneSignal.getUserId())
                        .then(id => {
                            expect(id).to.not.be.null;
                            return Promise.all([
                                Extension.set('user-id', id),
                                Utils.deletePlayer(id)]);
                        })
                        .then(() => {
                            // Now call any one of the APIs that requires our user ID
                            // We should get an error: User with this ID not found
                            if (kind === 'getTags') {
                                return OneSignal.getTags()
                                    .catch(error => {
                                        expect(error).to.have.property('errors');
                                        expect(error.errors).to.include('Could not find app_id for given player id.');
                                    });
                            } else if (kind === 'setSubscription') {
                                return OneSignal.setSubscription(false)
                                    .then(success => {
                                        console.log("This isn't supposed to happen. setSubscription() succeeded when the user was remotely deleted:", success);
                                    })
                                    .catch(error => {
                                        expect(error).to.have.property('errors');
                                        expect(error.errors).to.include('No user with this id found');
                                    });
                            }
                        })
                        .then(() => {
                            // User data should be deleted if this happens
                            return Promise.all([
                                    OneSignal.database.get('Ids'),
                                    OneSignal.database.get('Options'),
                                    OneSignal.database.get('NotificationOpened')
                                ])
                                .then(([ids, options, notificationOpened]) => {
                                    expect(ids).to.deep.equal({});
                                    expect(options).to.deep.equal({});
                                    expect(notificationOpened).to.deep.equal({});
                                });
                        })
                        .then(() => {
                            return new Promise(() => {
                                sessionStorage.clear();
                                gotoStep('next');
                            });
                        });
                } else if (step === 'next') {
                    return Utils.initialize(globals, {
                            welcomeNotification: false,
                            autoRegister: true,
                            dontWipeData: true
                        })
                        .then(() => {
                            if (location.protocol === 'https:') {
                                return Utils.expectEvent('subscriptionChange')
                            }
                        })
                        .then(id => Promise.all([
                                Extension.get('user-id'),
                                OneSignal.getUserId()
                            ])
                        )
                        .then(([originalStoredId, currentId]) => {
                            console.log('Original ID:', originalStoredId);
                            console.log('New ID:', currentId);
                            expect(originalStoredId).to.not.be.null;
                            expect(currentId).to.not.be.null;
                            expect(originalStoredId).to.not.equal(currentId);
                        });
                }
            });
        };

        it('should delete browser data and allow re-subscription with new ID if user deleted and getTags is called', function () {
            return testHelper(this.test, 'getTags');
        });

        it('should delete browser data and allow re-subscription with new ID if user deleted and setSubscription is called', function () {
            return testHelper(this.test, 'setSubscription');
        });
    });

    describe('Environment', () => {
        it('isPushNotificationsSupported() should return true', () => {
            expect(isPushNotificationsSupported()).to.be.true;
        });

        it('isPushNotificationsSupportedAndWarn() should return true', () => {
            expect(isPushNotificationsSupportedAndWarn()).to.be.true;
        });
    });

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
        it('should detect navigator language correctly', () => {
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

    describe('Notify Button', () => {
        it('should show site icon on notify button popup after initial subscribe', function () {
            return new SoloTest(this.test, {}, async () => {
                await Utils.initialize(globals, {
                    welcomeNotification: false,
                    autoRegister: false,
                    notifyButton: true
                });
                let app = await OneSignal.api.get(`apps/${OneSignal.config.appId}`, null, {
                    'Authorization': `Basic ${USER_AUTH_KEY}`
                });
                let iconUrl = app.chrome_web_default_notification_icon;
                if (!iconUrl) {
                    return Promise.reject('This OneSignal test app does not have a default notification icon. Please' +
                                          ' set one in your app settings.');
                }
                this.test.iconUrl = iconUrl;
                OneSignal.registerForPushNotifications();
                if (location.protocol === 'http:') {
                    await Utils.expectEvent('popupLoad')
                    await Extension.acceptHttpSubscriptionPopup();
                    await Utils.expectEvent('subscriptionChange');
                }
                // Check whether the icon exists in the popup HTML
                await Utils.wait(500);
                await OneSignal.notifyButton.dialog.show();
                let dialogIconHtml = document.querySelector('.push-notification-icon').innerHTML;
                expect(dialogIconHtml).to.include(this.test.iconUrl);
            });
        });
    });

    describe('SDK Events', () => {
        it('subscriptionChange event should fire at most once when subscribing', function () {
            return new SoloTest(this.test, {}, async () => {
                let subscriptionChangeEventCount = 0;
                OneSignal.on('subscriptionChange', () => subscriptionChangeEventCount++);
                await Utils.initialize(globals, {
                        welcomeNotification: false,
                        autoRegister: true
                    });
                await Utils.wait(1000);
                expect(subscriptionChangeEventCount).to.equal(1);
            });
        });

        it('notification displayed event data should strictly conform to documentation specs', function() {
            return new SoloTest(this.test, {}, async() => {
                await Utils.initialize(globals, {
                                           welcomeNotification: false,
                                           autoRegister: true
                                       });
                OneSignal.sendSelfNotification();
                let notification = await Utils.expectEvent('notificationDisplay');
                let iconUrl = globals.app.chrome_web_default_notification_icon;
                let lastNotification = await OneSignal.api.get(`notifications?app_id=${OneSignal.config.appId}&limit=1`, null, {
                    'Authorization': `Basic ${globals.app.basic_auth_key}`
                });
                let notificationId = lastNotification.notifications[0].id;
                expect(notification).to.not.be.null;
                expect(notification).to.deep.equal({
                                                           id: notificationId,
                                                           heading: 'OneSignal Test Message',
                                                           content: 'This is an example notification.',
                                                           icon: Utils.ensureImageResourceHttps(iconUrl),
                                                           url: `${location.origin}?_osp=do_not_open`
                                                       });
                await Utils.wait(150);
                await OneSignal.closeNotifications();
            });
        });
    });

    describe('Webhooks', () => {
        it('notification displayed webhook payload should strictly conform to documentation specs', function() {
            return new SoloTest(this.test, {}, async() => {
                await Utils.initialize(globals, {
                                           welcomeNotification: false,
                                           autoRegister: true,
                                           webhooks: true
                                       });
                OneSignal.sendSelfNotification();
                let userId = await OneSignal.getUserId();
                let notification = await Utils.expectEvent('notificationDisplay');

                let iconUrl = globals.app.chrome_web_default_notification_icon;
                let lastNotification = await OneSignal.api.get(`notifications?app_id=${OneSignal.config.appId}&limit=1`,
                                                               null, {
                                                                   'Authorization': `Basic ${globals.app.basic_auth_key}`
                                                               });
                expect(lastNotification).to.not.be.null;
                expect(lastNotification).to.have.property('notifications');
                let notificationId = lastNotification.notifications[0].id;

                let payload = await Utils.httpCall('GET', 'https://localhost:8080/webhook/notification.displayed');
                expect(payload).to.deep.equal({
                                                  event: 'notification.displayed',
                                                  id: notificationId,
                                                  userId: userId,
                                                  heading: 'OneSignal Test Message',
                                                  content: 'This is an example notification.',
                                                  url: `${location.origin}?_osp=do_not_open`,
                                                  icon: Utils.ensureImageResourceHttps(iconUrl)
                                              });
                await Utils.wait(150);
                await OneSignal.closeNotifications();
            });
        });
    });

    describe('Ensure HTTPS Image Resources', () => {
        it('should not translate HTTPS URLs', function() {
            expect(Utils.ensureImageResourceHttps('https://site.com/a.jpg')).to.equal('https://site.com/a.jpg');
        });

        it('should translate HTTP URLs', function() {
            expect(Utils.ensureImageResourceHttps('http://site.com/a/b/c/d.jpg')).to.equal('https://i0.wp.com/site.com/a/b/c/d.jpg');
        });

        it('should translate HTTP URLs except localhost URLs', function() {
            expect(Utils.ensureImageResourceHttps('http://localhost:3000/a/b/c/d.jpg')).to.equal('http://localhost:3000/a/b/c/d.jpg');
            expect(Utils.ensureImageResourceHttps('http://192.168.1.201:3000/a/b/c/d.jpg')).to.equal('http://192.168.1.201:3000/a/b/c/d.jpg');
            expect(Utils.ensureImageResourceHttps('http://127.0.0.1:3000/a/b/c/d.jpg')).to.equal('http://127.0.0.1:3000/a/b/c/d.jpg');
        });

        it('should translate HTTP URLs except those using Jetpack/Photon', function() {
            for (var i = 0; i <= 3; i++) {
                let url = `http://i${i}.wp.com/site.com/wp-content/uploads/2016/08/photo.png`;
                expect(Utils.ensureImageResourceHttps(url)).to.equal(url.replace('http:', 'https:'));
            }
        });
    });

    describe('HTTP Permission Request', () => {
        it('can activate by init option httpPermissionRequest', function() {
            return new SoloTest(this.test, {}, async() => {
                await Extension.setNotificationPermission(`${DEV_FRAME_HOST}/*`, 'allow');
                if (location.protocol === 'http:') {
                    Utils.initialize(globals, {
                        httpPermissionRequest: true
                    });
                    await Utils.expectEvent(OneSignal.EVENTS.TEST_WOULD_DISPLAY);
                }
            });
        });

        it('can activate manually by method showHttpPermissionRequest', function() {
            return new SoloTest(this.test, {}, async() => {
                if (location.protocol === 'http:') {
                    await Utils.initialize(globals, {
                        httpPermissionRequest: true,
                        autoRegister: false
                    });
                    OneSignal.showHttpPermissionRequest();
                    await Utils.expectEvent(OneSignal.EVENTS.TEST_WOULD_DISPLAY);
                }
            });
        });

        it('should not activate if init option is missing but showHttpPermissionRequest is called', function() {
            return new SoloTest(this.test, {}, async() => {
                if (location.protocol === 'http:') {
                    await Utils.initialize(globals, {
                    });
                    OneSignal.showHttpPermissionRequest();
                    await Utils.expectEvent(OneSignal.EVENTS.TEST_INIT_OPTION_DISABLED);
                }
            });
        });

        it('should trigger existing event permissionPromptDisplay when the prompt is displayed', function() {
            return new SoloTest(this.test, {}, async() => {
                if (location.protocol === 'http:') {
                    await Extension.setNotificationPermission(`${DEV_FRAME_HOST}/*`, 'ask');
                    Utils.initialize(globals, {
                        httpPermissionRequest: true
                    });
                    await Utils.expectEvent(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
                    await Extension.setNotificationPermission(`${DEV_FRAME_HOST}/*`, 'allow');
                }
            });
        });

        it.only('should trigger existing event notificationPermissionChange, with argument for prompt acceptance', function() {
            return new SoloTest(this.test, {}, async() => {
                if (location.protocol === 'http:') {
                    await Utils.initialize(globals, {
                        httpPermissionRequest: true
                    });
                    OneSignal.showHttpPermissionRequest();
                    await Utils.expectEvent(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, (e) => {
                        console.warn('I"M INSIDE HERE AND THE ARGUMENT FOR E IS:', e);
                        return e.to === 'granted';
                    });
                }
            });
        });
    });
});